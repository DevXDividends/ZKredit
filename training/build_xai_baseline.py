"""
Builds backend/models/xai_baseline.json, the only data the explainer needs at runtime.

It stores, for the trained logistic-regression model:
  * the weights and bias (read from the ONNX file the app actually serves)
  * the average value of every encoded feature over the training data

Run once from the project root (and again whenever you retrain the model):
    python training/build_xai_baseline.py --csv data/raw/loan_data.csv
Needs: onnx, pandas, numpy  (already in training/requirements.txt)
"""
import argparse
import json
import os
import sys

import numpy as np
import onnx
import pandas as pd
from onnx import numpy_helper

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS = os.path.join(ROOT, "backend", "models")
sys.path.insert(0, os.path.join(ROOT, "backend"))
from app.inference import CATEGORICAL_COLS, CONTINUOUS_COLS  # noqa: E402


def read_weights(onnx_path):
    m = onnx.load(onnx_path)
    init = {i.name: numpy_helper.to_array(i) for i in m.graph.initializer}
    gemm = next(n for n in m.graph.node if n.op_type == "Gemm")
    trans_b = next((a.i for a in gemm.attribute if a.name == "transB"), 0)
    w = init[gemm.input[1]]
    b = init[gemm.input[2]]
    w = (w if trans_b else w.T).reshape(-1)  # -> shape (n_features,)
    return w.astype(np.float64), float(np.asarray(b).reshape(-1)[0])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", required=True)
    args = ap.parse_args()

    cols = json.load(open(os.path.join(MODELS, "feature_columns.json")))
    scaler = json.load(open(os.path.join(MODELS, "scaler.json")))
    w, b = read_weights(os.path.join(MODELS, "loan_model.onnx"))
    assert len(w) == len(cols), f"{len(w)} weights vs {len(cols)} feature columns"

    df = pd.read_csv(args.csv).dropna(subset=CATEGORICAL_COLS + CONTINUOUS_COLS)
    X = pd.DataFrame(index=df.index)
    for c in CONTINUOUS_COLS:  # same min-max scaling as training / inference.py
        p = scaler[c]
        span = (p["max"] - p["min"]) or 1.0
        X[c] = ((df[c].astype(float) - p["min"]) / span).clip(0, 1)
    dummies = pd.get_dummies(df[CATEGORICAL_COLS], columns=CATEGORICAL_COLS).astype(float)
    X = pd.concat([X, dummies], axis=1).reindex(columns=cols, fill_value=0.0)

    means = X.mean().to_numpy(dtype=np.float64)
    out = {
        "feature_columns": cols,
        "weights": w.tolist(),
        "bias": b,
        "means": means.tolist(),
        "n_rows": int(len(X)),
        "base_logit": float(w @ means + b),
    }
    path = os.path.join(MODELS, "xai_baseline.json")
    json.dump(out, open(path, "w"), indent=2)
    print(f"Wrote {path}  (rows={len(X)}, base logit={out['base_logit']:.4f})")


if __name__ == "__main__":
    main()
