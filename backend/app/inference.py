"""
Model inference module — loads the real trained ONNX model (from training/train_model.py)
and replicates the EXACT same preprocessing used there, so predictions here match what
the ZK circuit will later prove.
"""

import json
import os

import numpy as np
import onnxruntime as ort

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # -> backend/
MODELS_DIR = os.path.join(BASE_DIR, "models")

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


class LoanModel:
    """Singleton-style wrapper: load once, reuse across requests."""

    def __init__(self):
        onnx_path = os.path.join(MODELS_DIR, "loan_model.onnx")
        feature_cols_path = os.path.join(MODELS_DIR, "feature_columns.json")
        scaler_path = os.path.join(MODELS_DIR, "scaler.json")

        if not os.path.exists(onnx_path):
            raise FileNotFoundError(
                f"Model not found at {onnx_path}. Run training/train_model.py first."
            )

        self.session = ort.InferenceSession(onnx_path, providers=["CPUExecutionProvider"])
        with open(feature_cols_path) as f:
            self.feature_columns = json.load(f)
        with open(scaler_path) as f:
            self.scaler_params = json.load(f)

        self.input_name = self.session.get_inputs()[0].name

    def preprocess(self, raw_input: dict) -> np.ndarray:
        """Turns a raw customer input dict into the exact feature vector the
        model expects — same one-hot + min-max scaling as training time."""
        missing = [c for c in CATEGORICAL_COLS + CONTINUOUS_COLS if c not in raw_input]
        if missing:
            raise ValueError(f"Missing required fields: {missing}")

        feature_vec = {col: 0.0 for col in self.feature_columns}

        # Continuous features: min-max scale using saved training params
        for col in CONTINUOUS_COLS:
            val = float(raw_input[col])
            params = self.scaler_params.get(col)
            if params is None:
                continue
            span = (params["max"] - params["min"]) or 1.0
            scaled = (val - params["min"]) / span
            scaled = max(0.0, min(1.0, scaled))  # clip out-of-range values into [0,1]
            if col in feature_vec:
                feature_vec[col] = scaled

        # Categorical features: one-hot, matching training-time column naming
        for col in CATEGORICAL_COLS:
            raw_val = str(raw_input[col])
            onehot_col = f"{col}_{raw_val}"
            if onehot_col in feature_vec:
                feature_vec[onehot_col] = 1.0
            # else: unseen category at inference time -> stays all-zero for that column,
            # which is a reasonable fallback (model just gets no signal from it)

        ordered = [feature_vec[c] for c in self.feature_columns]
        return np.array([ordered], dtype=np.float32)

    def predict(self, raw_input: dict):
        x = self.preprocess(raw_input)
        outputs = self.session.run(None, {self.input_name: x})
        score = float(outputs[0][0][0])
        decision = "Approved" if score > 0.5 else "Rejected"
        return {
            "prediction_score": score,
            "decision": decision,
            "model_input_vector": x.tolist()[0],  # needed later as EZKL circuit input
        }


_model_instance = None


def get_model() -> LoanModel:
    global _model_instance
    if _model_instance is None:
        _model_instance = LoanModel()
    return _model_instance
