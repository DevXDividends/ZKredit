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
import math
import os
import subprocess
import sys
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

# A healthy proof takes ~20s. If a prove call hangs, kill it and retry once; two attempts
# of 100s stay under Cloud Run's 300s request limit. Diagnostics from the stuck child
# (last stage + CPU/RSS samples) are included in the error so the cause is visible.
PROVE_ATTEMPTS = 2
PROVE_ATTEMPT_TIMEOUT_SECONDS = 100
_SAMPLE_EVERY_SECONDS = 10

# witness -> prove -> verify run in a plain child process (like training/generate_proof.py,
# which is known to work). Running ezkl's Rust runtime inside the uvicorn worker
# thread hung / panicked the whole server; a child process can't do that and can be killed.
_PROVE_SNIPPET = """
import json, sys, time, ezkl
def log(m): print(m, file=sys.stderr, flush=True)
inp, compiled, pk, vk, settings, witness, proof = sys.argv[1:8]
lo_b, hi_b = int(sys.argv[8]), int(sys.argv[9])
t = time.time(); log("witness:start")
w = ezkl.gen_witness(inp, compiled, witness)
if not w:
    print(json.dumps({"error": "witness generation failed"})); sys.exit(2)
w = w if isinstance(w, dict) else {}
zmin, zmax = w.get("min_lookup_inputs", 0), w.get("max_lookup_inputs", 0)
if zmin < lo_b or zmax > hi_b:
    print(json.dumps({"out_of_range": True, "zmin": zmin, "zmax": zmax})); sys.exit(4)
log("witness:done %.1fs" % (time.time() - t)); t = time.time(); log("prove:start")
if not ezkl.prove(witness, compiled, pk, proof):
    print(json.dumps({"error": "proof generation failed"})); sys.exit(3)
log("prove:done %.1fs" % (time.time() - t)); t = time.time(); log("verify:start")
ok = bool(ezkl.verify(proof, settings, vk))
log("verify:done %.1fs" % (time.time() - t))
print(json.dumps({"verified": ok}))
"""


def _lookup_bounds():
    """(lo, hi, scale) of the sigmoid-input values this circuit can prove.
    IMPORTANT: ezkl's prove() HANGS (no error) if a witness value falls outside the sigmoid
    lookup table. The table starts at settings.run_args.lookup_range[0] and holds ~2^logrows
    entries (verified empirically: for this circuit [-26112, +6648] proves, anything beyond hangs).
    Wider coverage needs the circuit re-calibrated with a wider lookup_range / larger logrows."""
    try:
        with open(SETTINGS_PATH) as f:
            ra = json.load(f)["run_args"]
        lo = int(ra["lookup_range"][0])
        return lo, lo + 2 ** int(ra["logrows"]) - 16, 2 ** int(ra["input_scale"])
    except Exception:
        return -10 ** 9, 10 ** 9, 4096  # unknown layout -> don't block


def _child_env() -> dict:
    env = dict(os.environ)
    # ezkl reads $HOME to find its SRS cache; Windows doesn't set it -> "NotPresent" panic.
    env.setdefault("HOME", os.path.expanduser("~"))
    return env


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


def _sample_child(pid: int, t0: float) -> str:
    """One line of /proc stats for the child: cpu seconds used, RSS, run state.
    Linux only (returns "" elsewhere). Flat cpu + state S = waiting; rising cpu = computing."""
    try:
        with open(f"/proc/{pid}/stat") as f:
            fields = f.read().rsplit(")", 1)[1].split()
        state, cpu = fields[0], (int(fields[11]) + int(fields[12])) / os.sysconf("SC_CLK_TCK")
        rss_mb = -1
        with open(f"/proc/{pid}/status") as f:
            for line in f:
                if line.startswith("VmRSS:"):
                    rss_mb = int(line.split()[1]) // 1024
        return f"t={time.time() - t0:.0f}s cpu={cpu:.0f}s rss={rss_mb}MB state={state}"
    except Exception:
        return ""


def _run_prove_once(args: list, timeout: float):
    """Runs the child; returns (returncode, stdout, stderr, samples, timed_out)."""
    proc = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env=_child_env())
    t0 = time.time()
    samples = []
    while True:
        try:
            out, err = proc.communicate(timeout=_SAMPLE_EVERY_SECONDS)
            return proc.returncode, out, err, samples, False
        except subprocess.TimeoutExpired:
            sample = _sample_child(proc.pid, t0)
            if sample:
                samples.append(sample)
            if time.time() - t0 >= timeout:
                proc.kill()
                out, err = proc.communicate()
                return proc.returncode, out, err, samples, True


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

    lo_b, hi_b, scale = _lookup_bounds()
    args = [sys.executable, "-c", _PROVE_SNIPPET, input_path, MODEL_COMPILED, PK_PATH,
            VK_PATH, SETTINGS_PATH, witness_path, proof_path, str(lo_b), str(hi_b)]
    t0 = time.time()
    note = ""

    for attempt in range(1, PROVE_ATTEMPTS + 1):
        returncode, out, err, samples, timed_out = _run_prove_once(args, PROVE_ATTEMPT_TIMEOUT_SECONDS)

        if timed_out:
            stages = [ln for ln in (err or "").strip().splitlines() if ln.strip()][-2:]
            picked = [samples[i] for i in sorted({0, len(samples) // 2, len(samples) - 1})] if samples else []
            note = f"Last child log: {' | '.join(stages) or 'none'}. Child samples: {' ; '.join(picked) or 'n/a'}."
            continue  # hung -> killed -> retry

        lines = [ln for ln in (out or "").strip().splitlines() if ln.strip()]
        try:
            result = json.loads(lines[-1]) if lines else {}
        except json.JSONDecodeError:
            result = {}
        if result.get("out_of_range"):
            z = result["zmin"] if result["zmin"] < lo_b else result["zmax"]
            sig = lambda v: 1 / (1 + math.exp(-v / scale))
            raise ProofPipelineError(
                f"Cannot prove this application: its model score ({sig(z):.2%}) is outside the range the "
                f"ZK circuit was calibrated for ({sig(lo_b):.2%} to {sig(hi_b):.1%}). The decision itself is "
                f"unaffected; only proof generation is unsupported for this input."
            )
        if returncode != 0 or "verified" not in result:
            reason = result.get("error") or (err or out or "").strip()[-400:] or f"exit code {returncode}"
            raise ProofPipelineError(f"Proof generation failed: {reason}")

        return {
            "verified": bool(result["verified"]),
            "proof_path": proof_path,
            "elapsed_seconds": round(time.time() - t0, 2),
        }

    raise ProofPipelineError(
        f"Proof generation timed out ({PROVE_ATTEMPTS} attempts x {PROVE_ATTEMPT_TIMEOUT_SECONDS}s). {note}"
    )


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