"""
Real EZKL proof pipeline — generates and locally verifies a ZK proof for a
specific application's data, using the model's fixed proving/verifying keys
(generated once via training/generate_proof.py; the same keys are reused for
every application's proof, since they're tied to the circuit, not the input).

Circuit artifact locations are configurable via the CIRCUIT_DIR env var so
this works both in local dev (default: ../circuits/loan_model relative to
the repo root) and in Docker (mounted volume, typically /app/circuits/loan_model).
"""

import json
import os
import time

import ezkl

from app.inference import get_model

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # backend/
PROJECT_ROOT = os.path.dirname(BASE_DIR)

CIRCUIT_DIR = os.environ.get("CIRCUIT_DIR") or os.path.join(PROJECT_ROOT, "circuits", "loan_model")

MODEL_COMPILED = os.path.join(CIRCUIT_DIR, "model.compiled")
SETTINGS_PATH = os.path.join(CIRCUIT_DIR, "settings.json")
PK_PATH = os.path.join(CIRCUIT_DIR, "pk.key")
VK_PATH = os.path.join(CIRCUIT_DIR, "vk.key")

PROOFS_DIR = os.path.join(BASE_DIR, "generated_proofs")
os.makedirs(PROOFS_DIR, exist_ok=True)


class ProofPipelineError(Exception):
    pass


def _check_circuit_files():
    missing = [p for p in [MODEL_COMPILED, SETTINGS_PATH, PK_PATH, VK_PATH] if not os.path.exists(p)]
    if missing:
        raise ProofPipelineError(
            "Missing circuit artifact(s): " + ", ".join(missing) + ". "
            "pk.key is not committed to git (it's large) — generate it locally with "
            "training/generate_proof.py, then make sure circuits/loan_model/ is available "
            "to the backend (CIRCUIT_DIR env var, or the default relative path in local dev)."
        )


async def ensure_srs_downloaded():
    """get_srs is a no-op (fast) if the SRS is already cached locally at
    ~/.ezkl/srs/ — safe to call on every startup. Needs network access the
    first time. Uses the async form (confirmed necessary — get_srs returns
    an awaitable even though it's not flagged as a coroutine function)."""
    if not os.path.exists(SETTINGS_PATH):
        return  # nothing to do yet if circuits aren't present
    return await ezkl.get_srs(SETTINGS_PATH)


def generate_proof_for_application(application_id: str, raw_input: dict) -> dict:
    """Preprocess -> witness -> prove -> verify, for one application's real data.
    Returns a dict with verification result, proof file path, and timing."""
    _check_circuit_files()

    model = get_model()
    x = model.preprocess(raw_input)  # np.ndarray, shape (1, n_features)

    app_dir = os.path.join(PROOFS_DIR, application_id)
    os.makedirs(app_dir, exist_ok=True)
    input_path = os.path.join(app_dir, "input.json")
    witness_path = os.path.join(app_dir, "witness.json")
    proof_path = os.path.join(app_dir, "proof.json")

    with open(input_path, "w") as f:
        json.dump({"input_data": x.tolist()}, f)

    t0 = time.time()

    witness_result = ezkl.gen_witness(input_path, MODEL_COMPILED, witness_path)
    if not witness_result:
        raise ProofPipelineError("Witness generation failed")

    proof_result = ezkl.prove(witness_path, MODEL_COMPILED, PK_PATH, proof_path)
    if not proof_result:
        raise ProofPipelineError("Proof generation failed")

    verified = ezkl.verify(proof_path, SETTINGS_PATH, VK_PATH)
    elapsed = time.time() - t0

    return {
        "verified": bool(verified),
        "proof_path": proof_path,
        "elapsed_seconds": round(elapsed, 2),
    }