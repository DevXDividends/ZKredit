"""
ZKredit — Phase 2: Preprocessing + Model Training
---------------------------------------------------
Trains a Logistic Regression model (as a tiny PyTorch nn.Module, so it
exports cleanly to ONNX) on the Kaggle "Loan Approval Classification Data"
dataset (taweilo/loan-approval-classification-data).

Usage:
    python3 train_model.py --csv ../data/raw/loan_data.csv
    (run from inside the training/ folder, with the training venv active)

Outputs (written to ../backend/models/):
    loan_model.onnx          - ONNX export of the trained model
    scaler.json              - normalization params (for backend reuse)
    feature_columns.json     - final encoded feature order (critical for ONNX input order)
    metrics.json             - accuracy / precision / recall / confusion matrix
"""

import argparse
import json
import os

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix

RANDOM_SEED = 42
torch.manual_seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

CATEGORICAL_COLS = [
    "person_gender",
    "person_education",
    "person_home_ownership",
    "loan_intent",
    "previous_loan_defaults_on_file",
]

CONTINUOUS_COLS = [
    "person_age",
    "person_income",
    "person_emp_exp",
    "loan_amnt",
    "loan_int_rate",
    "loan_percent_income",
    "cb_person_cred_hist_length",
    "credit_score",
]

TARGET_COL = "loan_status"


class LogisticRegressionModel(nn.Module):
    """z = w.x + b ; prediction = sigmoid(z)  — the exact formula in the docs."""

    def __init__(self, n_features: int):
        super().__init__()
        self.linear = nn.Linear(n_features, 1)

    def forward(self, x):
        return torch.sigmoid(self.linear(x))


def load_and_preprocess(csv_path: str):
    df = pd.read_csv(csv_path)
    print(f"Loaded {len(df)} rows, {len(df.columns)} columns")

    missing = [c for c in CATEGORICAL_COLS + CONTINUOUS_COLS + [TARGET_COL] if c not in df.columns]
    if missing:
        raise ValueError(f"CSV is missing expected columns: {missing}")

    df = df.dropna(subset=CATEGORICAL_COLS + CONTINUOUS_COLS + [TARGET_COL]).reset_index(drop=True)

    # One-hot encode categoricals (drop_first=False -> keep all dummy cols, deterministic order)
    df_cat = pd.get_dummies(df[CATEGORICAL_COLS], columns=CATEGORICAL_COLS)
    df_cat = df_cat.astype(float)

    # Min-max normalize continuous features to [0, 1] — required for ZK circuit numeric stability
    scaler_params = {}
    df_cont = df[CONTINUOUS_COLS].astype(float).copy()
    for col in CONTINUOUS_COLS:
        col_min, col_max = df_cont[col].min(), df_cont[col].max()
        span = (col_max - col_min) if (col_max - col_min) != 0 else 1.0
        df_cont[col] = (df_cont[col] - col_min) / span
        scaler_params[col] = {"min": float(col_min), "max": float(col_max)}

    X = pd.concat([df_cont, df_cat], axis=1)
    feature_columns = list(X.columns)
    y = df[TARGET_COL].astype(float).values

    print(f"Final feature count after encoding: {len(feature_columns)}")
    return X.values.astype(np.float32), y.astype(np.float32), feature_columns, scaler_params


def train(X_train, y_train, n_features, epochs=200, lr=0.05):
    model = LogisticRegressionModel(n_features)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)
    loss_fn = nn.BCELoss()

    X_t = torch.tensor(X_train)
    y_t = torch.tensor(y_train).unsqueeze(1)

    for epoch in range(epochs):
        optimizer.zero_grad()
        preds = model(X_t)
        loss = loss_fn(preds, y_t)
        loss.backward()
        optimizer.step()
        if (epoch + 1) % 20 == 0:
            print(f"  epoch {epoch+1}/{epochs}  loss={loss.item():.4f}")

    return model


def evaluate(model, X_test, y_test):
    model.eval()
    with torch.no_grad():
        preds = model(torch.tensor(X_test)).squeeze().numpy()
    pred_labels = (preds > 0.5).astype(int)

    metrics = {
        "accuracy": float(accuracy_score(y_test, pred_labels)),
        "precision": float(precision_score(y_test, pred_labels)),
        "recall": float(recall_score(y_test, pred_labels)),
        "f1": float(f1_score(y_test, pred_labels)),
        "confusion_matrix": confusion_matrix(y_test, pred_labels).tolist(),
    }
    return metrics


def export_onnx(model, n_features, out_path):
    model.eval()
    dummy_input = torch.randn(1, n_features)
    torch.onnx.export(
        model,
        dummy_input,
        out_path,
        input_names=["input"],
        output_names=["output"],
        opset_version=13,
        dynamic_axes=None,  # fixed batch size of 1 — required for EZKL circuit compilation
        dynamo=False,  # legacy exporter: simpler graph, more reliable for EZKL's ONNX->circuit conversion
    )
    print(f"ONNX model exported to {out_path}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", required=True, help="Path to the Kaggle loan dataset CSV")
    parser.add_argument("--epochs", type=int, default=200)
    args = parser.parse_args()

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    models_dir = os.path.join(base_dir, "backend", "models")
    os.makedirs(models_dir, exist_ok=True)

    X, y, feature_columns, scaler_params = load_and_preprocess(args.csv)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_SEED, stratify=y
    )

    print(f"\nTraining Logistic Regression on {X_train.shape[0]} rows, {X_train.shape[1]} features...")
    model = train(X_train, y_train, n_features=X_train.shape[1], epochs=args.epochs)

    print("\nEvaluating on held-out test set...")
    metrics = evaluate(model, X_test, y_test)
    print(json.dumps(metrics, indent=2))

    onnx_path = os.path.join(models_dir, "loan_model.onnx")
    export_onnx(model, X_train.shape[1], onnx_path)

    with open(os.path.join(models_dir, "feature_columns.json"), "w") as f:
        json.dump(feature_columns, f, indent=2)
    with open(os.path.join(models_dir, "scaler.json"), "w") as f:
        json.dump(scaler_params, f, indent=2)
    with open(os.path.join(models_dir, "metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)

    # Save a sample input (post-preprocessing) — EZKL needs this to calibrate the circuit
    sample_input = X_test[0].tolist()
    with open(os.path.join(models_dir, "sample_input.json"), "w") as f:
        json.dump({"input_data": [sample_input]}, f, indent=2)

    print("\nAll artifacts saved to models/. Ready for Phase 3 (EZKL circuit compilation).")


if __name__ == "__main__":
    main()
