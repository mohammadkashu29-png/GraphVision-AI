"""EXPERIMENTAL handwriting -> Big Five (continuous) regression pipeline.

Inputs (real data only; the empty templates are refused):
  participants.csv : writer_id, age_band, handedness, education, first_language, t_O,t_C,t_E,t_A,t_N, ...
  samples.csv      : sample_id, writer_id, session, task, image_path, device, dpi
  images dir       : handwriting scans referenced by image_path

Steps: link by writer_id -> validate (no silent dropping) -> extract 8 OpenCV features per image
-> AGGREGATE to one row per writer (mean of that writer's samples; every participant has equal weight)
-> hold out a final writer-level TEST set once, up front (never used for selection)
-> repeated writer-grouped K-fold CV on the remaining "development" writers to compare multi-output regressors
-> pick the best handwriting-feature model by CV R2 -> refit on all development writers -> evaluate ONCE on the test set
-> report MAE, RMSE, R2 per trait (CV mean/SD over repeats; test with writer-bootstrap 95% CI) vs mean and demographic baselines.
No synthetic labels are ever generated.

Usage:
  python personality_pipeline.py --participants participants.csv --samples samples.csv --images images/
  (optional) --external-participants P2.csv --external-samples S2.csv --external-images IMG2/
"""
import argparse, json, os, sys
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import RidgeCV
from sklearn.base import clone
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

TRAITS = ["t_O", "t_C", "t_E", "t_A", "t_N"]
COVARIATES = ["age_band", "handedness", "education", "first_language"]
FEATURES = [
    "ink_density",
    "slant_angle_degrees",
    "estimated_char_height_px",
    "inter_word_gap_ratio",
    "baseline_slope_deg",
    "baseline_variance",
    "stroke_thickness_px",
    "consistency_score",
]

# Only DPI‑scaled pixel dimensions
PIXEL_FEATURES = ["estimated_char_height_px", "stroke_thickness_px"]  # scaled to 300 dpi
MIN_WRITERS_HARD, MIN_WRITERS_STABLE, MIN_WRITERS_SOFT = 20, 100, 194
MIN_TEST_CI, MIN_TEST_CI_HARD = 30, 10  # held-out writers needed for usable / any bootstrap CI  # 194 writers ~ 80% power for r=0.20 (see PROTOCOL.md)


class DataError(Exception):
    def __init__(self, problems): super().__init__("\n".join(problems)); self.problems = problems


def _extractor(backend_hint):
    # Resolve project root (parent of this training directory)
    project_root = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
    # Candidate backend locations: explicit hint, sibling backend, legacy fallback
    candidates = [backend_hint,
                  os.path.join(project_root, "backend"),
                  os.path.join(project_root, "graphvision-ai", "backend")]
    for p in candidates:
        if p and os.path.isdir(p) and os.path.exists(os.path.join(p, "services", "handwriting_pipeline.py")):
            # Ensure the path is on sys.path only once
            if p not in sys.path:
                sys.path.insert(0, os.path.abspath(p))
            from services.handwriting_pipeline import analyze_handwriting
            from services.feature_meta import FEATURE_ORDER
            if list(FEATURE_ORDER) != FEATURES:
                raise DataError([f"Feature names differ from backend extractor: pipeline {FEATURES} vs backend {list(FEATURE_ORDER)}"])
            return analyze_handwriting
    raise DataError(["Cannot locate backend/services/handwriting_pipeline.py. Use --backend PATH to specify the correct backend directory."])


def load_cohort(pcsv, scsv, img_dir, a):
    """Link + validate one cohort. Raises DataError listing every problem; never drops rows silently."""
    p, s = pd.read_csv(pcsv, dtype=str), pd.read_csv(scsv, dtype=str)
    if len(p) == 0 or len(s) == 0:
        raise DataError([f"{pcsv} / {scsv} contain no records (empty templates). Nothing to train or evaluate."])
    problems, warns = [], []
    need_p, need_s = ["writer_id"] + TRAITS, ["sample_id", "writer_id", "image_path", "dpi"]
    problems += [f"participants missing column: {c}" for c in need_p if c not in p.columns]
    problems += [f"samples missing column: {c}" for c in need_s if c not in s.columns]
    if problems: raise DataError(problems)
    for df in (p, s):
        df["writer_id"] = df["writer_id"].str.strip()
    s["sample_id"] = s["sample_id"].str.strip()
    for name, df, col in (("participants", p, "writer_id"), ("samples", s, "sample_id"), ("samples", s, "image_path")):
        if df[col].isna().any() or (df[col] == "").any(): problems.append(f"{name}: missing {col}")
        d = df[col].dropna()
        if d.duplicated().any(): problems.append(f"{name}: duplicate {col}: {sorted(d[d.duplicated()].unique())[:5]}")
    for t in TRAITS:  # numeric, present, in range
        v = pd.to_numeric(p[t], errors="coerce"); p[t] = v
        if v.isna().any(): problems.append(f"{t}: {int(v.isna().sum())} missing/non-numeric scores")
        bad = v[(v < a.score_min) | (v > a.score_max)]
        if len(bad): problems.append(f"{t}: {len(bad)} scores outside [{a.score_min}, {a.score_max}]")
    s["dpi"] = pd.to_numeric(s["dpi"], errors="coerce")
    if (s["dpi"].isna() | (s["dpi"] <= 0)).any(): problems.append("samples: missing/invalid dpi")
    for c in [c for c in TRAITS + COVARIATES if c in s.columns]:  # optional copies of labels/covariates in samples.csv must agree
        m = s.merge(p[["writer_id", c]], on="writer_id", suffixes=("", "_p"))
        if c in TRAITS: bad = m[~np.isclose(pd.to_numeric(m[c], errors="coerce"), m[c + "_p"].astype(float), equal_nan=True)]
        else: bad = m[m[c].fillna("").str.strip() != m[c + "_p"].fillna("").str.strip()]
        if len(bad): problems.append(f"{c}: {len(bad)} samples disagree with participants.csv (writers {sorted(bad.writer_id.unique())[:5]})")
    unknown = set(s.writer_id) - set(p.writer_id)
    if unknown: problems.append(f"samples reference unknown writer_id: {sorted(unknown)[:5]}")
    nosamp = sorted(set(p.writer_id) - set(s.writer_id))
    if nosamp: warns.append(f"{len(nosamp)} participants have no samples and are EXCLUDED: {nosamp[:5]}")
    full = lambda x: x if os.path.isabs(x) else os.path.join(img_dir, x)
    s["_path"] = s["image_path"].map(lambda x: full(str(x)))
    missing = s[~s["_path"].map(os.path.exists)]
    if len(missing): problems.append(f"{len(missing)} broken image paths, e.g. {missing['image_path'].head(3).tolist()}")
    if problems: raise DataError(problems)

    extract, rows = _extractor(a.backend), []
    for r in s.to_dict("records"):
        try:
            with open(r["_path"], "rb") as fh: feats = extract(fh.read())[0]["features"]
        except Exception as e:  # noqa: BLE001
            problems.append(f"{r['sample_id']}: cannot extract features ({e})"); continue
        rows.append({"sample_id": r["sample_id"], **{k: feats[k] for k in FEATURES}})
    if problems: raise DataError(problems)
    f = pd.DataFrame(rows).merge(s[["sample_id", "writer_id", "dpi"]], on="sample_id")
    f[FEATURES] = f[FEATURES].apply(pd.to_numeric, errors="coerce")
    for c in PIXEL_FEATURES: f[c] = f[c] * 300.0 / f["dpi"]
    f = f.merge(p[["writer_id"] + TRAITS + [c for c in COVARIATES if c in p.columns]], on="writer_id")
    for c in COVARIATES:
        f[c] = f[c].fillna("unknown") if c in f.columns else "unknown"
    return f, warns


def build_models(seed):
    num = Pipeline([("imp", SimpleImputer(strategy="median")), ("sc", StandardScaler())])
    cat = OneHotEncoder(handle_unknown="ignore")
    ridge = lambda: RidgeCV(alphas=np.logspace(-2, 3, 12))
    ct = lambda feats, covs: ColumnTransformer(([("f", num, FEATURES)] if feats else []) + ([("c", cat, COVARIATES)] if covs else []), sparse_threshold=0)
    return {
        "mean_baseline": DummyRegressor(strategy="mean"),
        "covariates_only_ridge": Pipeline([("x", ct(False, True)), ("m", ridge())]),
        "ridge_features": Pipeline([("x", ct(True, False)), ("m", ridge())]),
        "ridge_features_plus_covariates": Pipeline([("x", ct(True, True)), ("m", ridge())]),
        "random_forest_features": Pipeline([("x", ct(True, False)),
                                            ("m", RandomForestRegressor(200, min_samples_leaf=3, random_state=seed, n_jobs=1))]),
    }


COLS = FEATURES + COVARIATES
clean = lambda a: [None if not np.isfinite(x) else float(x) for x in np.asarray(a, float)]


def aggregate(df):
    """One row per writer: mean of that writer's samples (all tasks/sessions). Equal weight per participant."""
    g = df.groupby("writer_id")
    for c in TRAITS + COVARIATES:  # labels/covariates must be identical across all of a writer's linked samples
        if (g[c].nunique(dropna=False) > 1).any(): raise DataError([f"{c} varies across samples of the same writer"])
    return pd.concat([g[FEATURES].mean(), g[COVARIATES].first(), g[TRAITS].first(), g.size().rename("n_samples")], axis=1).reset_index()


def metrics(Y, P):
    err = Y - P
    ss_tot = ((Y - Y.mean(0)) ** 2).sum(0)
    with np.errstate(divide="ignore", invalid="ignore"):
        r2 = np.where(ss_tot > 0, 1 - (err ** 2).sum(0) / ss_tot, np.nan)
    return {"MAE": np.abs(err).mean(0), "RMSE": np.sqrt((err ** 2).mean(0)), "R2": r2}


def repeated_group_folds(writers, k, repeats, seed):
    """Each repeat reshuffles writers and splits them into k folds; a writer is in exactly one test fold per repeat."""
    w = np.array(sorted(set(writers)))
    for r in range(repeats):
        parts = np.array_split(np.random.default_rng(seed + r).permutation(w), k)
        yield [(np.concatenate([parts[j] for j in range(k) if j != i]), parts[i]) for i in range(k)]


def cv_metrics(proto, dev, k, repeats, seed):
    Y, per_repeat = dev[TRAITS].values, []
    for folds in repeated_group_folds(dev.writer_id.values, k, repeats, seed):
        P = np.full(Y.shape, np.nan)
        for tr_ids, te_ids in folds:
            tr, te = dev.writer_id.isin(tr_ids).values, dev.writer_id.isin(te_ids).values
            P[te] = clone(proto).fit(dev.loc[tr, COLS], Y[tr]).predict(dev.loc[te, COLS])
        per_repeat.append(metrics(Y, P))  # pooled out-of-fold predictions for ALL development writers
    return {m: {"mean": np.mean([r[m] for r in per_repeat], 0), "std": np.std([r[m] for r in per_repeat], 0)}
            for m in ("MAE", "RMSE", "R2")}


def bootstrap_ci(Y, P, n_boot, seed):
    rng, res = np.random.default_rng(seed), []
    for _ in range(n_boot):
        i = rng.integers(0, len(Y), len(Y)); res.append(metrics(Y[i], P[i]))
    with np.errstate(all="ignore"):
        return {m: np.nanpercentile([r[m] for r in res], [2.5, 97.5], axis=0).T for m in ("MAE", "RMSE", "R2")}


def bh(p):
    p = np.asarray(p, float); o = np.argsort(p); m = len(p)
    adj = np.empty(m); adj[o] = np.minimum.accumulate((p[o] * m / np.arange(1, m + 1))[::-1])[::-1]
    return np.minimum(adj, 1)


def mean_r2(cv): return float(np.nanmean(cv["R2"]["mean"]))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--participants", required=True); ap.add_argument("--samples", required=True)
    ap.add_argument("--images", required=True); ap.add_argument("--out", default="personality_results.json")
    ap.add_argument("--seed", type=int, default=42); ap.add_argument("--backend")
    ap.add_argument("--folds", type=int, default=5); ap.add_argument("--repeats", type=int, default=20)
    ap.add_argument("--test-fraction", type=float, default=0.2); ap.add_argument("--permutations", type=int, default=100); ap.add_argument("--bootstrap", type=int, default=1000)
    ap.add_argument("--score-min", type=float, default=1.0); ap.add_argument("--score-max", type=float, default=5.0)
    ap.add_argument("--external-participants"); ap.add_argument("--external-samples"); ap.add_argument("--external-images")
    a = ap.parse_args()

    try:
        df, warns = load_cohort(a.participants, a.samples, a.images, a)
    except DataError as e:
        print("DATA VALIDATION FAILED (no model trained):"); [print("  -", x) for x in e.problems]; sys.exit(2)

    try:
        W = aggregate(df)
    except DataError as e:
        print("DATA VALIDATION FAILED (no model trained):"); [print("  -", x) for x in e.problems]; sys.exit(2)
    n = len(W)
    if n < MIN_WRITERS_HARD:
        print(f"Only {n} unique participants (< {MIN_WRITERS_HARD}). Refusing to train: results would be meaningless."); sys.exit(2)
    if n < MIN_WRITERS_STABLE: warns.append(f"{n} participants < {MIN_WRITERS_STABLE}: CV/test estimates are very unstable. Not interpretable as evidence.")
    if n < MIN_WRITERS_SOFT: warns.append(f"{n} participants < {MIN_WRITERS_SOFT} (~80% power for r=0.20). Treat all results as exploratory.")
    spw = W["n_samples"]
    if spw.max() > 2 * max(spw.min(), 1): warns.append(f"Unequal samples per participant (min {spw.min()}, max {spw.max()}); handled by per-writer aggregation.")

    order = np.random.default_rng(a.seed).permutation(sorted(W.writer_id))
    n_test = max(2, round(a.test_fraction * n))
    test_ids, dev_ids = set(order[:n_test]), set(order[n_test:])
    assert not (test_ids & dev_ids)
    # Split into development and test sets (deterministic order)
    dev, test = (
        W[W.writer_id.isin(dev_ids)].reset_index(drop=True),
        W[W.writer_id.isin(test_ids)].reset_index(drop=True),
    )
    # Ensure a stable row order for reproducible CV and permutation results
    dev = dev.sort_values(by="writer_id").reset_index(drop=True)
    test = test.sort_values(by="writer_id").reset_index(drop=True)
    if len(dev) < 2 * a.folds: print(f"Development set ({len(dev)} writers) too small for {a.folds} folds."); sys.exit(2)
    counts = {"development": {"participants": len(dev), "samples": int(dev.n_samples.sum())},
              "final_test": {"participants": len(test), "samples": int(test.n_samples.sum())}}
    print("Counts (participants / samples):", {k: tuple(v.values()) for k, v in counts.items()})

    models = build_models(a.seed)
    fm = [m for m in models if "features" in m]
    pick = lambda r2: max(fm, key=lambda m: float(np.nanmean(r2[m])))  # ONE selection rule, used for observed AND permuted data
    cv = {name: cv_metrics(m, dev, a.folds, a.repeats, a.seed) for name, m in models.items()}  # development writers only
    selected = pick({m: cv[m]["R2"]["mean"] for m in fm})  # selection uses development-set CV only; test set not touched yet
    ref = ["mean_baseline", "covariates_only_ridge"]
    delta = {r: clean(cv[selected]["R2"]["mean"] - cv[r]["R2"]["mean"]) for r in ref}

    perm = None
    if a.permutations:
        # Same procedure as the observed statistic: same folds, repeats, seed and selection rule; ONLY the labels are permuted.
        rng, null = np.random.default_rng(a.seed + 999), []
        for b in range(a.permutations):
            d2 = dev.copy(); d2[TRAITS] = dev[TRAITS].values[rng.permutation(len(dev))]
            r = {m: cv_metrics(models[m], d2, a.folds, a.repeats, a.seed)["R2"]["mean"] for m in fm}
            null.append(r[pick(r)])
            if (b + 1) % 10 == 0: print(f"  permutation {b + 1}/{a.permutations}", file=sys.stderr, flush=True)
        pv = (1 + (np.array(null) >= cv[selected]["R2"]["mean"]).sum(0)) / (1 + a.permutations)
        perm = {"B": a.permutations, "min_resolvable_p": 1 / (1 + a.permutations), "p": clean(pv), "p_BH": clean(bh(pv)),
                "null_mean_R2": clean(np.nanmean(null, 0)),
                "procedure": f"{a.folds}-fold x {a.repeats}-repeat CV, seed {a.seed}, same selection rule as observed"}

    Ytest, test_res = test[TRAITS].values, {}
    for name in dict.fromkeys([selected] + ref):  # selected model + the two baselines; evaluated once
        P = clone(models[name]).fit(dev[COLS], dev[TRAITS].values).predict(test[COLS])
        test_res[name] = (metrics(Ytest, P), P)
    n_t = len(test)
    if n_t < MIN_TEST_CI_HARD:
        ci = None; warns.append(f"Only {n_t} held-out writers: bootstrap CIs are NOT computed (meaningless below {MIN_TEST_CI_HARD}). Test metrics are anecdotal.")
    else:
        ci = bootstrap_ci(Ytest, test_res[selected][1], a.bootstrap, a.seed)
        if n_t < MIN_TEST_CI: warns.append(f"Only {n_t} held-out writers: bootstrap CIs are unreliable (want >= {MIN_TEST_CI}); do not interpret them as evidence.")

    external = None
    if a.external_participants:
        ext, w2 = load_cohort(a.external_participants, a.external_samples, a.external_images, a); warns += w2
        if set(ext.writer_id) & set(W.writer_id): print("External cohort shares writer_id with the main cohort: not independent."); sys.exit(2)
        E = aggregate(ext); allw = pd.concat([dev, test])
        P = clone(models[selected]).fit(allw[COLS], allw[TRAITS].values).predict(E[COLS])
        external = {"participants": len(E), "samples": int(E.n_samples.sum()),
                    "metrics": {k: clean(v) for k, v in metrics(E[TRAITS].values, P).items()}}

    status = ("EXPERIMENTAL - evaluated on one external cohort (n=%d); not a validated personality predictor" % external["participants"]
              if external else "EXPERIMENTAL - no evaluation on independent participants yet; not a validated personality predictor")
    pack = lambda d: {m: {s: clean(v) for s, v in x.items()} for m, x in d.items()}
    out = {"status": status, "seed": a.seed, "protocol": {"folds": a.folds, "repeats": a.repeats, "test_fraction": a.test_fraction,
           "unit": "one row per writer (mean of samples)"}, "unique_participants": n, "samples": int(len(df)), "counts": counts,
           "samples_per_participant": {"min": int(spw.min()), "median": float(spw.median()), "max": int(spw.max())},
           "development_writers": sorted(map(str, dev_ids)), "test_writers": sorted(map(str, test_ids)),
           "cv": {m: pack(v) for m, v in cv.items()}, "selected_by_cv": selected, "selection_data": "development-set CV only; final test writers used once, after selection", "selected_minus_baseline_cv_R2": delta, "permutation_test": perm,
           "final_test": {m: {**{k: clean(v) for k, v in r[0].items()},
                              **({"ci95": {k: [clean(r) for r in v] for k, v in ci.items()}, "ci95_reliable": bool(n_t >= MIN_TEST_CI)} if (m == selected and ci is not None) else {})}
                          for m, r in test_res.items()}, "external_cohort": external, "warnings": warns}
    json.dump(out, open(a.out, "w"), indent=2, default=lambda o: None if isinstance(o, float) and np.isnan(o) else str(o))

    f3 = lambda x: "  n/a " if not np.isfinite(x) else f"{x:+.3f}"
    print("\n" + status); [print("WARNING:", w) for w in warns]
    print(f"\nCV on development writers ({a.folds}-fold x {a.repeats} repeats), R2 mean (SD across repeats) per trait:")
    for m in models:
        print(f"  {m:32s}", "  ".join(f"{t}:{f3(cv[m]['R2']['mean'][i])}({cv[m]['R2']['std'][i]:.2f})" for i, t in enumerate(TRAITS)))
    print(f"Selected by CV: {selected}. Selected minus covariates-only CV R2 per trait:", [round(x, 3) if x is not None else None for x in delta["covariates_only_ridge"]])
    if perm: print(f"Permutation test of the selected model's CV R2 (B={perm['B']}) per trait: p={[round(x, 3) for x in perm['p']]}  BH-adjusted p={[round(x, 3) for x in perm['p_BH']]}")
    print(f"\nFINAL TEST (one evaluation, {len(test)} writers). Per trait MAE / RMSE / R2 (95% writer-bootstrap CI for R2 of selected):")
    for m, (r, _) in test_res.items():
        for i, t in enumerate(TRAITS):
            extra = (f"  CI[{f3(ci['R2'][i][0])},{f3(ci['R2'][i][1])}]" + ("" if n_t >= MIN_TEST_CI else f" (UNRELIABLE, n_test={n_t})")) if (m == selected and ci is not None) else ""
            print(f"  {m:32s} {t}: MAE {r['MAE'][i]:.3f}  RMSE {r['RMSE'][i]:.3f}  R2 {f3(r['R2'][i])}{extra}")
    print(f"\nSaved {a.out}")


if __name__ == "__main__":
    main()
