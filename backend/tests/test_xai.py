"""Tests for the SHAP explainer. Pure functions only: no DB, no network."""
import json
import os

import numpy as np
import pytest

from app import xai
from app.inference import MODELS_DIR, get_model

SAMPLE = {
    "person_age": 28, "person_gender": "female", "person_education": "Bachelor",
    "person_income": 65000, "person_emp_exp": 5, "person_home_ownership": "RENT",
    "loan_amnt": 12000, "loan_intent": "MEDICAL", "loan_int_rate": 11.5,
    "loan_percent_income": 0.18, "cb_person_cred_hist_length": 6, "credit_score": 680,
    "previous_loan_defaults_on_file": "No",
}
REJECT = {  # a real row from the dataset that the model rejects
    "person_age": 21, "person_gender": "female", "person_education": "High School",
    "person_income": 12282, "person_emp_exp": 0, "person_home_ownership": "OWN",
    "loan_amnt": 1000, "loan_intent": "EDUCATION", "loan_int_rate": 11.14,
    "loan_percent_income": 0.08, "cb_person_cred_hist_length": 2, "credit_score": 504,
    "previous_loan_defaults_on_file": "Yes",
}


def test_contributions_add_up_to_the_model_output():
    r = xai.explain(SAMPLE)
    total = r["base_value"] + sum(c["contribution"] for c in r["contributions"])
    assert abs(total - r["final_value"]) < 1e-2  # rounding of 13 values to 4 dp


@pytest.mark.parametrize("payload", [SAMPLE, REJECT])
def test_matches_the_served_model(payload):
    r = xai.explain(payload)
    m = get_model().predict(payload)
    assert r["decision"] == m["decision"]
    assert abs(r["score"] - m["prediction_score"]) < 1e-4


def test_rejected_case_has_negative_total_and_summary():
    r = xai.explain(REJECT)
    assert r["decision"] == "Rejected" and r["final_value"] < 0
    assert r["summary"].startswith("Rejected")


def test_thirteen_fields_sorted_by_impact_and_sensitive_flagged():
    r = xai.explain(SAMPLE)
    cs = r["contributions"]
    assert len(cs) == 13
    mags = [abs(c["contribution"]) for c in cs]
    assert mags == sorted(mags, reverse=True)
    assert {c["field"] for c in cs if c["sensitive"]} == {"person_gender", "person_age"}
    assert abs(sum(c["share"] for c in cs) - 100) < 0.5


def test_baseline_weights_match_onnx_model():
    """Guards against retraining the model but forgetting to rebuild xai_baseline.json."""
    with open(os.path.join(MODELS_DIR, "xai_baseline.json")) as f:
        d = json.load(f)
    x = get_model().preprocess(SAMPLE)[0].astype(np.float64)
    z = float(np.array(d["weights"]) @ x + d["bias"])
    p = 1 / (1 + np.exp(-z))
    assert abs(p - get_model().predict(SAMPLE)["prediction_score"]) < 1e-4


def test_agrees_with_shap_library_if_installed():
    shap = pytest.importorskip("shap")
    with open(os.path.join(MODELS_DIR, "xai_baseline.json")) as f:
        d = json.load(f)
    w, b, mu = np.array(d["weights"]), d["bias"], np.array(d["means"])
    x = get_model().preprocess(SAMPLE).astype(float)
    sv = np.array(shap.LinearExplainer((w, b), mu.reshape(1, -1)).shap_values(x)).reshape(-1)
    assert np.allclose(sv, w * (x[0] - mu), atol=1e-9)
