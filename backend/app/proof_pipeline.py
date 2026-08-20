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


def run_tamper_demo(application_id: str) -> dict:
    """Educational demo, not a security feature: takes this application's
    already-generated real proof, corrupts one byte in a COPY of it, and
    re-runs verification to show it genuinely fails. This exists because a
    legitimately-generated proof will always verify successfully (that's the
    point of a ZK proof) — so without this, users never see what a failed
    verification looks like and can't tell the check is doing real work."""
    app_dir = os.path.join(PROOFS_DIR, application_id)
    real_proof_path = os.path.join(app_dir, "proof.json")

    if not os.path.exists(real_proof_path):
        raise ProofPipelineError(
            "No generated proof found for this application yet. Generate a proof first."
        )

    with open(real_proof_path) as f:
        proof_data = json.load(f)

    tampered_path = os.path.join(app_dir, "proof_tampered_demo.json")
    tampered_data = json.loads(json.dumps(proof_data))  # deep copy

    # IMPORTANT: proof.json has TWO representations of the same proof bytes —
    # "proof" (a JSON list of ints, the raw bytes ezkl.verify() actually
    # deserializes) and "hex_proof" (a "0x..." string, a convenience export
    # mainly used for EVM/Solidity calldata). Tampering only hex_proof does
    # nothing to local verification — "proof" is the field that matters here.
    # We flip a byte in both, so this stays correct regardless of which
    # field a given ezkl version actually reads.
    tampered_something = False

    proof_bytes = tampered_data.get("proof")
    if isinstance(proof_bytes, list) and len(proof_bytes) > 0:
        mid = len(proof_bytes) // 2
        proof_bytes[mid] = proof_bytes[mid] ^ 0xFF  # flip all bits of one byte
        tampered_data["proof"] = proof_bytes
        tampered_something = True

    proof_hex = tampered_data.get("hex_proof")
    if isinstance(proof_hex, str) and len(proof_hex) > 0:
        prefix = "0x" if proof_hex.startswith("0x") else ""
        body = proof_hex[len(prefix):]
        mid = len(body) // 2
        flipped_char = "0" if body[mid] != "0" else "1"
        tampered_data["hex_proof"] = prefix + body[:mid] + flipped_char + body[mid + 1:]
        tampered_something = True

    if not tampered_something:
        raise ProofPipelineError("Unexpected proof format — can't run tamper demo.")

    with open(tampered_path, "w") as f:
        json.dump(tampered_data, f)

    try:
        tampered_result = ezkl.verify(tampered_path, SETTINGS_PATH, VK_PATH)
    except Exception:
        tampered_result = False  # ezkl raises on malformed/invalid proofs — that's also a "fails to verify"

    # Re-confirm the real proof still verifies fine, for side-by-side comparison.
    real_result = ezkl.verify(real_proof_path, SETTINGS_PATH, VK_PATH)

    return {
        "real_proof_verified": bool(real_result),
        "tampered_proof_verified": bool(tampered_result),
    }