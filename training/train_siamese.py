"""Trains the Siamese CNN on CEDAR with writer-disjoint splits matching ONLY the
first training pipeline from the source notebook (Cells 9–47).

Configuration:
  - Input: 224 x 224 grayscale
  - Normalization: mean 0.5, std 0.5
  - Architecture: SiameseNetwork(SignatureEncoder: Conv 32->64->128, MaxPool, FC 100352->256->128)
  - Contrastive Loss Margin: 1.0
  - Optimizer: Adam(lr=0.001)
  - Epochs: 10
  - Writer splits: 40 train, 7 val, 8 test (seed 42)
  - Pairs per writer: 100 (50 genuine, 50 forged)
  - Validation-selected threshold sweep (over 1000 candidates)
  - Writes:
      backend/checkpoints/best_siamese_model.pth (and siamese_best.pt)
      backend/checkpoints/model_config.json
      backend/checkpoints/eval_results.json

Usage:
  python training/train_siamese.py --cedar /path/to/CEDAR [--epochs 10]
Expected CEDAR layout:
  <cedar>/<writer_id>/original_<w>_<n>.png and forgeries_<w>_<n>.png
"""

import argparse
import json
import os
import random
import sys
from datetime import datetime, timezone

import numpy as np
import torch
from PIL import Image
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms

sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend"))
from config import CHECKPOINT_DIR  # noqa: E402
from services.signature_service import ContrastiveLoss, SiameseNetwork  # noqa: E402

IMG_H, IMG_W = 224, 224


class SignaturePairDataset(Dataset):
    def __init__(self, pairs, transform=None):
        self.pairs = pairs
        self.transform = transform

    def __len__(self):
        return len(self.pairs)

    def __getitem__(self, index):
        path1, path2, label = self.pairs[index]
        img1 = Image.open(path1).convert("L")
        img2 = Image.open(path2).convert("L")
        if self.transform:
            img1 = self.transform(img1)
            img2 = self.transform(img2)
        label = torch.tensor(float(label), dtype=torch.float32)
        return img1, img2, label


def create_pairs(cedar_path, writer_list, pairs_per_writer=100):
    """Exact pair creation logic from notebook Cell 10."""
    pairs = []
    for writer in writer_list:
        writer_path = os.path.join(cedar_path, str(writer))
        if not os.path.isdir(writer_path):
            continue

        genuine_files = sorted(
            [f for f in os.listdir(writer_path) if f.startswith("original_") and f.endswith(".png")]
        )
        forged_files = sorted(
            [f for f in os.listdir(writer_path) if f.startswith("forgeries_") and f.endswith(".png")]
        )

        if not genuine_files or not forged_files:
            continue

        # Positive pairs: Genuine + Genuine
        for _ in range(pairs_per_writer // 2):
            img1, img2 = random.sample(genuine_files, 2)
            pairs.append((os.path.join(writer_path, img1), os.path.join(writer_path, img2), 1))

        # Negative pairs: Genuine + Forgery
        for _ in range(pairs_per_writer // 2):
            genuine = random.choice(genuine_files)
            forged = random.choice(forged_files)
            pairs.append((os.path.join(writer_path, genuine), os.path.join(writer_path, forged), 0))

    random.shuffle(pairs)
    return pairs


def evaluate(model, dataloader, criterion, device):
    """Validation evaluation function from notebook Cell 33."""
    model.eval()
    total_loss = 0.0
    with torch.no_grad():
        for img1, img2, labels in dataloader:
            img1 = img1.to(device)
            img2 = img2.to(device)
            labels = labels.to(device)
            emb1, emb2 = model(img1, img2)
            loss = criterion(emb1, emb2, labels)
            total_loss += loss.item()
    return total_loss / len(dataloader)


def get_distances(model, dataloader, device):
    """Notebook Cell 43 distance extractor."""
    model.eval()
    distances = []
    all_labels = []
    with torch.no_grad():
        for img1, img2, labels in dataloader:
            img1 = img1.to(device)
            img2 = img2.to(device)
            emb1, emb2 = model(img1, img2)
            d = torch.nn.functional.pairwise_distance(emb1, emb2)
            distances.extend(d.cpu().numpy())
            all_labels.extend(labels.numpy())
    return np.array(distances), np.array(all_labels)


def main():
    parser = argparse.ArgumentParser(description="Train Siamese CNN on CEDAR (Notebook First Pipeline)")
    parser.add_argument("--cedar", required=True, help="Path to CEDAR dataset folder containing writer subdirectories")
    parser.add_argument("--epochs", type=int, default=10, help="Number of training epochs (default: 10)")
    parser.add_argument("--batch-size", type=int, default=32, help="Batch size (default: 32)")
    parser.add_argument("--lr", type=float, default=0.001, help="Learning rate (default: 0.001)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed (default: 42)")
    args = parser.parse_args()

    # Reproducibility
    random.seed(args.seed)
    np.random.seed(args.seed)
    torch.manual_seed(args.seed)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}")

    # Check for inner folder structure if user passes outer CEDAR
    cedar_root = args.cedar
    if os.path.isdir(os.path.join(cedar_root, "CEDAR")):
        cedar_root = os.path.join(cedar_root, "CEDAR")

    # Writer-disjoint split matching notebook Cell 9
    writers = [int(w) for w in os.listdir(cedar_root) if os.path.isdir(os.path.join(cedar_root, w)) and w.isdigit()]
    writers.sort()
    random.shuffle(writers)

    n = len(writers)
    n_train = 40 if n >= 55 else int(n * 0.72)
    n_val = 7 if n >= 55 else int(n * 0.13)
    train_writers = writers[:n_train]
    val_writers = writers[n_train : n_train + n_val]
    test_writers = writers[n_train + n_val :]

    print(f"Writer split: {len(train_writers)} train / {len(val_writers)} val / {len(test_writers)} test")

    train_pairs = create_pairs(cedar_root, train_writers, pairs_per_writer=100)
    val_pairs = create_pairs(cedar_root, val_writers, pairs_per_writer=100)
    test_pairs = create_pairs(cedar_root, test_writers, pairs_per_writer=100)

    transform = transforms.Compose([
        transforms.Grayscale(num_output_channels=1),
        transforms.Resize((IMG_H, IMG_W)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.5], std=[0.5]),
    ])

    train_loader = DataLoader(
        SignaturePairDataset(train_pairs, transform=transform),
        batch_size=args.batch_size,
        shuffle=True,
    )
    val_loader = DataLoader(
        SignaturePairDataset(val_pairs, transform=transform),
        batch_size=args.batch_size,
        shuffle=False,
    )
    test_loader = DataLoader(
        SignaturePairDataset(test_pairs, transform=transform),
        batch_size=args.batch_size,
        shuffle=False,
    )

    model = SiameseNetwork(embedding_dim=128).to(device)
    criterion = ContrastiveLoss(margin=1.0)
    optimizer = torch.optim.Adam(model.parameters(), lr=args.lr)

    ckpt_path = os.path.join(CHECKPOINT_DIR, "best_siamese_model.pth")
    ckpt_compat = os.path.join(CHECKPOINT_DIR, "siamese_best.pt")

    train_losses = []
    val_losses = []
    best_val_loss = float("inf")

    for epoch in range(1, args.epochs + 1):
        model.train()
        running_loss = 0.0
        for img1, img2, labels in train_loader:
            img1, img2, labels = img1.to(device), img2.to(device), labels.to(device)
            optimizer.zero_grad()
            emb1, emb2 = model(img1, img2)
            loss = criterion(emb1, emb2, labels)
            loss.backward()
            optimizer.step()
            running_loss += loss.item()

        train_loss = running_loss / len(train_loader)
        val_loss = evaluate(model, val_loader, criterion, device)
        train_losses.append(train_loss)
        val_losses.append(val_loss)

        marker = ""
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            torch.save(model.state_dict(), ckpt_path)
            torch.save(model.state_dict(), ckpt_compat)
            marker = " <- Best model saved"

        print(f"Epoch [{epoch:02d}/{args.epochs}] Train Loss: {train_loss:.4f} Val Loss: {val_loss:.4f}{marker}")

    # Load best checkpoint for evaluation
    model.load_state_dict(torch.load(ckpt_path, map_location=device))
    model.eval()

    # Threshold selection on validation set (Cell 45)
    val_distances, val_labels = get_distances(model, val_loader, device)
    thresholds = np.linspace(val_distances.min(), val_distances.max(), 1000)
    accuracies = [accuracy_score(val_labels, (val_distances < t).astype(int)) for t in thresholds]
    best_idx = np.argmax(accuracies)
    best_threshold = float(thresholds[best_idx])
    best_val_accuracy = float(accuracies[best_idx])
    print(f"Best validation threshold: {best_threshold:.6f} (accuracy: {best_val_accuracy * 100:.2f}%)")

    # Evaluation on held-out test writers (Cells 46-47)
    test_distances, test_labels = get_distances(model, test_loader, device)
    test_preds = (test_distances < best_threshold).astype(int)
    y_test = test_labels.astype(int)

    acc = float(accuracy_score(y_test, test_preds))
    prec = float(precision_score(y_test, test_preds, zero_division=0))
    rec = float(recall_score(y_test, test_preds, zero_division=0))
    f1 = float(f1_score(y_test, test_preds, zero_division=0))
    tn, fp, fn, tp = confusion_matrix(y_test, test_preds, labels=[0, 1]).ravel()
    far = float(fp / (fp + tn)) if (fp + tn) else 0.0
    frr = float(fn / (fn + tp)) if (fn + tp) else 0.0

    scores = -test_distances
    fpr, tpr, _ = roc_curve(y_test, scores)
    try:
        auc_val = float(roc_auc_score(y_test, scores))
    except ValueError:
        auc_val = None

    idx = np.linspace(0, len(fpr) - 1, min(len(fpr), 300)).astype(int)
    eval_results = {
        "dataset": "CEDAR",
        "pipeline": "first_training_pipeline",
        "model": "Siamese CNN",
        "embedding_dim": 128,
        "contrastive_margin": 1.0,
        "epochs": args.epochs,
        "learning_rate": args.lr,
        "threshold": best_threshold,
        "threshold_selection": "maximum accuracy over writer-disjoint validation pairs",
        "val_accuracy_at_threshold": best_val_accuracy,
        "accuracy": acc,
        "precision": prec,
        "recall": rec,
        "f1": f1,
        "far": far,
        "frr": frr,
        "eer": float(fpr[np.argmin(np.abs(fpr - (1 - tpr)))]),
        "roc_auc": auc_val,
        "test_pairs": int(len(test_pairs)),
        "splits": {"train_writers": len(train_writers), "val_writers": len(val_writers), "test_writers": len(test_writers)},
        "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
        "roc_curve": {"fpr": [round(float(fpr[i]), 5) for i in idx], "tpr": [round(float(tpr[i]), 5) for i in idx]},
        "loss_curves": {"train": [round(v, 5) for v in train_losses], "validation": [round(v, 5) for v in val_losses]},
        "trained_at": datetime.now(timezone.utc).isoformat(),
    }

    with open(os.path.join(CHECKPOINT_DIR, "eval_results.json"), "w", encoding="utf-8") as f:
        json.dump(eval_results, f, indent=2)

    with open(os.path.join(CHECKPOINT_DIR, "model_config.json"), "w", encoding="utf-8") as f:
        json.dump({
            "img_height": IMG_H,
            "img_width": IMG_W,
            "embedding_dim": 128,
            "contrastive_margin": 1.0,
            "decision_threshold": best_threshold,
            "threshold_selection": eval_results["threshold_selection"],
            "normalization": {"mean": 0.5, "std": 0.5},
            "architecture": "SiameseNetwork(SignatureEncoder: Conv 32->64->128, MaxPool, FC 100352->256->128)",
            "dataset": "CEDAR",
            "pipeline": "first_training_pipeline_cells_39_41",
            "trained_at": eval_results["trained_at"],
        }, f, indent=2)

    print("\nTraining & evaluation completed successfully!")
    print(f"Artifacts saved to {CHECKPOINT_DIR}")


if __name__ == "__main__":
    main()
