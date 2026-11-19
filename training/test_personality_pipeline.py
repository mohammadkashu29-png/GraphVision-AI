"""SOFTWARE TEST ONLY. Uses randomly generated images and random 'scores' in a temp folder to check that
personality_pipeline.py runs and enforces its rules. Nothing here is research evidence; no result is meaningful.
Usage: python test_personality_pipeline.py [--backend PATH_TO/graphvision-ai/backend]
"""
import argparse, json, os, subprocess, sys, tempfile
import cv2, numpy as np, pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
ap = argparse.ArgumentParser(); ap.add_argument("--backend"); A = ap.parse_args()
import personality_pipeline as pp
BACKEND = A.backend or next(p for p in [os.path.join(HERE, "..", "backend"), os.path.join(HERE, "..", "graphvision-ai", "backend")] if os.path.isdir(p))
T = pp.TRAITS; ok_all = True


def check(name, cond):
    global ok_all; ok_all &= bool(cond); print(("PASS  " if cond else "FAIL  ") + name)


def make(d, n_w=40, seed=0):
    rng = np.random.default_rng(seed); os.makedirs(f"{d}/img", exist_ok=True); P, S = [], []
    for w in range(n_w):
        P.append(dict(writer_id=f"w{w}", age_band=rng.choice(["18-24", "25-34"]), handedness="R", education="UG", first_language="en",
                      **{t: f"{rng.uniform(1, 5):.4f}" for t in T}))
        for k in range(3 if w % 4 else 1):
            im = np.full((300, 600, 3), 255, np.uint8)
            cv2.putText(im, "hello world " * int(rng.integers(1, 3)), (20, 100), cv2.FONT_HERSHEY_SCRIPT_SIMPLEX, float(rng.uniform(1, 2)), (20, 20, 20), int(rng.integers(2, 5)))
            cv2.imwrite(f"{d}/img/w{w}_{k}.png", im); S.append(dict(sample_id=f"w{w}_{k}", writer_id=f"w{w}", session=k % 2 + 1, task="copy", image_path=f"w{w}_{k}.png", device="s", dpi=300))
    pd.DataFrame(P).to_csv(f"{d}/p.csv", index=False); pd.DataFrame(S).to_csv(f"{d}/s.csv", index=False)


def run(d, p="p.csv", s="s.csv", *extra):
    return subprocess.run([sys.executable, os.path.join(HERE, "personality_pipeline.py"), "--backend", BACKEND, "--participants", f"{d}/{p}", "--samples", f"{d}/{s}",
                           "--images", f"{d}/img", "--out", f"{d}/out.json", "--repeats", "2", "--permutations", "10", *extra], capture_output=True, text=True)


with tempfile.TemporaryDirectory() as d:
    print("SOFTWARE TEST - synthetic random data, not research evidence\n")
    check("syntax compiles", all(subprocess.run([sys.executable, "-m", "py_compile", os.path.join(HERE, f)]).returncode == 0
                                  for f in ("personality_pipeline.py", "test_personality_pipeline.py")))
    make(d)
    pp._extractor(BACKEND); from services.feature_meta import FEATURE_ORDER as FO
    check("feature names match backend extractor", pp.FEATURES == list(FO))
    # empty templates refused
    for f in ("p_empty.csv", "s_empty.csv"): open(f"{d}/{f}", "w").write(",".join(["writer_id"] + T) + "\n" if f[0] == "p" else "sample_id,writer_id,image_path,dpi\n")
    r = run(d, "p_empty.csv", "s_empty.csv"); check("empty templates refused (exit 2)", r.returncode == 2)
    # conflicting duplicate of a label inside samples.csv
    s = pd.read_csv(f"{d}/s.csv", dtype=str).merge(pd.read_csv(f"{d}/p.csv", dtype=str)[["writer_id", "t_O"]], on="writer_id"); s.loc[0, "t_O"] = "9.0"; s.loc[1, "t_O"] = "1.0" if s.loc[1, "t_O"] != "1.0" else "2.0"
    s.to_csv(f"{d}/s_bad.csv", index=False); r = run(d, "p.csv", "s_bad.csv"); check("label disagreement between files refused", r.returncode == 2 and "disagree" in r.stdout)
    # broken path / duplicate id / bad score
    s = pd.read_csv(f"{d}/s.csv", dtype=str); s.loc[0, "image_path"] = "nope.png"; s.loc[2, "sample_id"] = s.loc[3, "sample_id"]; s.to_csv(f"{d}/s_bad2.csv", index=False)
    p = pd.read_csv(f"{d}/p.csv", dtype=str); p.loc[0, "t_C"] = "7"; p.to_csv(f"{d}/p_bad.csv", index=False)
    r = run(d, "p_bad.csv", "s_bad2.csv"); check("broken path + duplicate id + invalid score all reported", r.returncode == 2 and all(k in r.stdout for k in ("broken image", "duplicate sample_id", "outside")))
    # full run
    r = run(d); out = json.load(open(f"{d}/out.json")); check("full run completes", r.returncode == 0)
    check("status marked EXPERIMENTAL", out["status"].startswith("EXPERIMENTAL"))
    check("dev/test writers disjoint", not set(out["development_writers"]) & set(out["test_writers"]))
    check("small test set (<10 writers): CIs suppressed + warning", "ci95" not in out["final_test"][out["selected_by_cv"]] and any("NOT computed" in w for w in out["warnings"]))
    check("selection uses only features models", "features" in out["selected_by_cv"])
    # observed statistic == same procedure with unpermuted labels
    a = type("A", (), dict(backend=BACKEND, score_min=1.0, score_max=5.0))(); df, _ = pp.load_cohort(f"{d}/p.csv", f"{d}/s.csv", f"{d}/img", a); W = pp.aggregate(df)
    dev = W[W.writer_id.isin(out["development_writers"])].reset_index(drop=True); sel = out["selected_by_cv"]
    r2 = pp.cv_metrics(pp.build_models(42)[sel], dev, out["protocol"]["folds"], out["protocol"]["repeats"], 42)["R2"]["mean"]
    check("permutation procedure reproduces observed CV exactly", np.allclose(r2, np.array(out["cv"][sel]["R2"]["mean"], float), atol=0, rtol=0))
    # changing ONLY test writers' labels must not change selection / CV / permutation
    p = pd.read_csv(f"{d}/p.csv", dtype=str); rng = np.random.default_rng(5); m = p.writer_id.isin(out["test_writers"])
    for t in T: p.loc[m, t] = [f"{x:.4f}" for x in rng.uniform(1, 5, m.sum())]
    p.to_csv(f"{d}/p_t.csv", index=False); json.dump(out, open(f"{d}/out_a.json", "w")); run(d, "p_t.csv"); out2 = json.load(open(f"{d}/out.json"))
    check("test labels do not affect selection/CV/permutation", out["selected_by_cv"] == out2["selected_by_cv"] and out["cv"] == out2["cv"] and out["permutation_test"] == out2["permutation_test"])
    check("test labels DO affect final test metrics (expected)", out["final_test"] != out2["final_test"])
    # external cohort must be independent
    r = run(d, "p.csv", "s.csv", "--external-participants", f"{d}/p.csv", "--external-samples", f"{d}/s.csv", "--external-images", f"{d}/img")
    check("external cohort sharing writer_id refused", r.returncode == 2 and "not independent" in r.stdout)
print("\nALL SOFTWARE TESTS PASSED" if ok_all else "\nSOME TESTS FAILED"); sys.exit(0 if ok_all else 1)
