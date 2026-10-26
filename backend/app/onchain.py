"""
On-chain submission of ZKredit proofs.

Takes the proof.json that proof_pipeline.py already produced, converts it into
what LoanApplicationRegistry.submitProof() expects, signs a transaction and
sends it to an EVM chain (local Anvil by default, Sepolia later by changing
only the .env values below).

Everything here is OPTIONAL: if ONCHAIN_ENABLED is not "true", the rest of the
app behaves exactly as before and nothing in this module touches the network.

Environment variables
---------------------
ONCHAIN_ENABLED      "true" to turn the feature on (default: off)
RPC_URL              JSON-RPC endpoint (default http://127.0.0.1:8545)
REGISTRY_ADDRESS     deployed LoanApplicationRegistry address
ONCHAIN_PRIVATE_KEY  key of the account that pays gas (Anvil's public dev key
                     locally; a throwaway wallet on a testnet. NEVER a real one)
EXPLORER_TX_URL      optional, e.g. https://sepolia.etherscan.io/tx/
"""
import json
import os
from pathlib import Path

ABI_PATH = Path(__file__).parent / "abi" / "LoanApplicationRegistry.json"

# Custom errors declared in LoanApplicationRegistry.sol -> friendly messages.
_ERROR_MESSAGES = {
    "ApplicationAlreadyExists()": "This application is already recorded on-chain.",
    "VerifierNotRegistered()": "No verifier is registered for this model version on the registry. "
                               "Run the deploy script again (Anvil forgets everything when restarted).",
    "ProofVerificationFailed()": "The on-chain verifier rejected this proof.",
    "ModelAlreadyRegistered()": "Model already registered.",
    "NotModelOwner()": "Not the model owner.",
}


class OnchainError(Exception):
    """Anything that goes wrong while talking to the chain. Message is user-safe."""


# ---------------------------------------------------------------- config ----

def is_enabled() -> bool:
    return os.environ.get("ONCHAIN_ENABLED", "false").strip().lower() == "true"


def _cfg() -> dict:
    return {
        "rpc_url": os.environ.get("RPC_URL", "http://127.0.0.1:8545"),
        "registry": os.environ.get("REGISTRY_ADDRESS", "").strip(),
        "private_key": os.environ.get("ONCHAIN_PRIVATE_KEY", "").strip(),
        "explorer": os.environ.get("EXPLORER_TX_URL", "").strip(),
    }


# ------------------------------------------------- pure helper functions ----
# (no network, no web3 import: these are unit-tested without a chain)

def load_proof_json(path: str) -> dict:
    with open(path) as f:
        return json.load(f)


def proof_bytes(proof_json: dict) -> bytes:
    """EZKL stores the proof twice: `proof` (list of ints) and `hex_proof`.
    They are the same bytes; the int list is the one ezkl.verify() reads."""
    return bytes(proof_json["proof"])


def instances_to_ints(proof_json: dict) -> list:
    """proof.json['instances'] = [[ '<64 hex chars>', ... ]]. Each entry is a
    field element serialised LITTLE-endian (e.g. 'a5000...00' means 0xa5 = 165).
    The Solidity verifier wants plain uint256 values, so reverse the bytes."""
    rows = proof_json["instances"]
    flat = rows[0] if rows and isinstance(rows[0], list) else rows
    out = []
    for h in flat:
        h = h[2:] if h.startswith("0x") else h
        out.append(int.from_bytes(bytes.fromhex(h), "little"))
    return out


def decision_from_instances(instances: list, output_scale: int = 4096) -> int:
    """Last instance is the model's sigmoid output scaled by 2^12.
    Same rule as contracts/test/RealProofIntegration.t.sol: >= 0.5 -> Approved."""
    return 1 if instances[-1] * 2 >= output_scale else 0


def application_id_bytes(application_id: str) -> bytes:
    """bytes32 id = keccak256(uuid string)."""
    from web3 import Web3
    return bytes(Web3.keccak(text=application_id))


def application_hash_bytes(raw_input: dict) -> bytes:
    """Commitment to the applicant's data: keccak256 of canonical JSON.
    Only this hash is stored on-chain, not the data itself."""
    from web3 import Web3
    canonical = json.dumps(raw_input, sort_keys=True, separators=(",", ":"))
    return bytes(Web3.keccak(text=canonical))


def tamper(proof: bytes, index: int = 100) -> bytes:
    """Flip one byte (same index as the Foundry tamper test)."""
    b = bytearray(proof)
    b[index] = 0x01 if b[index] == 0x00 else 0x00
    return bytes(b)


def _friendly_error(exc: Exception) -> str:
    """Turn a web3 revert/exception into a short readable message."""
    from web3 import Web3

    # Revert data can arrive as exc.data (hex str) or as bytes inside exc.args.
    candidates = [getattr(exc, "data", None)] + list(getattr(exc, "args", ()))
    revert_hex = None
    for c in candidates:
        if isinstance(c, (bytes, bytearray)):
            revert_hex = bytes(c).hex()
        elif isinstance(c, str) and c.startswith("0x") and len(c) >= 10:
            revert_hex = c[2:]
        if revert_hex is not None:
            break

    if revert_hex is None:
        # some web3 versions only embed the bytes in the message: "...: b'\xb4-\x0e\x00'"
        import ast, re
        m = re.search(r"b'(?:[^'\\]|\\.)*'", str(exc))
        if m:
            try:
                revert_hex = ast.literal_eval(m.group(0)).hex() or None
            except Exception:
                revert_hex = None

    if revert_hex:
        for sig, msg in _ERROR_MESSAGES.items():
            if revert_hex[:8] == bytes(Web3.keccak(text=sig)).hex()[:8]:
                return msg

    text = str(exc)
    for sig, msg in _ERROR_MESSAGES.items():
        if sig.split("(")[0] in text:
            return msg
    if "execution reverted" in text:
        # The Halo2 verifier reverts with EMPTY data when a proof is invalid.
        return "The on-chain verifier rejected this proof (invalid proof)."
    return f"Transaction failed: {text[:200]}"


# ------------------------------------------------------ web3 connection ----

def _connect():
    """Returns (w3, registry_contract, account_or_None). Raises OnchainError."""
    if not is_enabled():
        raise OnchainError("On-chain verification is disabled (set ONCHAIN_ENABLED=true).")
    try:
        from web3 import Web3
    except ImportError:
        raise OnchainError("web3 is not installed (pip install web3).")

    cfg = _cfg()
    if not cfg["registry"]:
        raise OnchainError("REGISTRY_ADDRESS is not set. Run the deploy script and copy the address into .env.")
    if not Web3.is_address(cfg["registry"]):
        raise OnchainError("REGISTRY_ADDRESS is not a valid address.")

    w3 = Web3(Web3.HTTPProvider(cfg["rpc_url"], request_kwargs={"timeout": 15}))
    try:
        connected = w3.is_connected()
    except Exception:
        connected = False
    if not connected:
        raise OnchainError(
            f"Cannot reach the blockchain node at {cfg['rpc_url']}. Is Anvil running? "
            "(From Docker use http://host.docker.internal:8545 and start anvil with --host 0.0.0.0)"
        )

    address = Web3.to_checksum_address(cfg["registry"])
    if len(w3.eth.get_code(address)) == 0:
        raise OnchainError(
            "No contract at REGISTRY_ADDRESS on this chain. Anvil was probably restarted, "
            "run the deploy script again."
        )

    with open(ABI_PATH) as f:
        abi = json.load(f)
    registry = w3.eth.contract(address=address, abi=abi)
    return w3, registry


def _account(w3):
    key = _cfg()["private_key"]
    if not key:
        raise OnchainError("ONCHAIN_PRIVATE_KEY is not set.")
    try:
        return w3.eth.account.from_key(key)
    except Exception:
        raise OnchainError("ONCHAIN_PRIVATE_KEY is not a valid private key.")


# ------------------------------------------------------------ public API ----

def get_status() -> dict:
    """Safe-to-expose status (no secrets). Never raises."""
    cfg = _cfg()
    status = {
        "enabled": is_enabled(),
        "connected": False,
        "chain_id": None,
        "registry_address": cfg["registry"] or None,
        "explorer_tx_url": cfg["explorer"] or None,
        "total_applications": None,
        "detail": None,
    }
    if not status["enabled"]:
        status["detail"] = "disabled"
        return status
    try:
        w3, registry = _connect()
        status["connected"] = True
        status["chain_id"] = w3.eth.chain_id
        status["total_applications"] = registry.functions.totalApplications().call()
    except OnchainError as e:
        status["detail"] = str(e)
    except Exception as e:  # pragma: no cover
        status["detail"] = f"Unexpected error: {str(e)[:150]}"
    return status


def _prepare(application_id, raw_input, proof_path, model_version_id):
    pj = load_proof_json(proof_path)
    proof = proof_bytes(pj)
    instances = instances_to_ints(pj)
    decision = decision_from_instances(instances)
    args = (
        application_id_bytes(application_id),
        int(model_version_id),
        proof,
        instances,
        application_hash_bytes(raw_input),
        decision,
    )
    return args, decision


def submit_proof_onchain(application_id: str, raw_input: dict, proof_path: str,
                         model_version_id: int = 1) -> dict:
    """Sends the real transaction. Returns tx details or raises OnchainError."""
    if not os.path.exists(proof_path):
        raise OnchainError("Proof file not found. Generate a proof first.")

    w3, registry = _connect()
    acct = _account(w3)
    args, decision = _prepare(application_id, raw_input, proof_path, model_version_id)

    # Cheap pre-check so a duplicate gives a clear message instead of a revert.
    existing = registry.functions.getApplication(args[0]).call()
    if existing[4] != 0:  # timestamp != 0
        raise OnchainError(_ERROR_MESSAGES["ApplicationAlreadyExists()"])

    fn = registry.functions.submitProof(*args)
    try:
        gas_estimate = fn.estimate_gas({"from": acct.address})
    except Exception as e:
        raise OnchainError(_friendly_error(e))

    tx_params = {
        "from": acct.address,
        "nonce": w3.eth.get_transaction_count(acct.address, "pending"),
        "gas": int(gas_estimate * 1.3),
        "chainId": w3.eth.chain_id,
    }
    latest = w3.eth.get_block("latest")
    base_fee = latest.get("baseFeePerGas")
    if base_fee is not None:
        tip = w3.to_wei(1, "gwei")
        tx_params["maxPriorityFeePerGas"] = tip
        tx_params["maxFeePerGas"] = int(base_fee * 2 + tip)
    else:
        tx_params["gasPrice"] = w3.eth.gas_price

    try:
        tx = fn.build_transaction(tx_params)
        signed = acct.sign_transaction(tx)
        raw = getattr(signed, "raw_transaction", None) or signed.rawTransaction
        tx_hash = w3.eth.send_raw_transaction(raw)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=90)
    except OnchainError:
        raise
    except Exception as e:
        raise OnchainError(_friendly_error(e))

    if receipt["status"] != 1:
        raise OnchainError("Transaction was mined but reverted.")

    return {
        "tx_hash": "0x" + bytes(tx_hash).hex().removeprefix("0x"),
        "block_number": receipt["blockNumber"],
        "gas_used": receipt["gasUsed"],
        "decision": decision,
        "decision_label": "Approved" if decision == 1 else "Rejected",
        "chain_id": tx_params["chainId"],
        "registry_address": registry.address,
    }


def simulate_tampered(application_id: str, raw_input: dict, proof_path: str,
                      model_version_id: int = 1) -> dict:
    """Demo: asks the chain (eth_call, NO transaction, no gas) to verify the
    real proof and a copy with ONE flipped byte, side by side."""
    w3, registry = _connect()
    acct = _account(w3)
    args, _ = _prepare(application_id, raw_input, proof_path, model_version_id)

    def attempt(proof: bytes) -> dict:
        a = list(args)
        a[2] = proof
        # fresh id so the "already exists" check can't mask the verifier result
        a[0] = application_id_bytes(application_id + ":simulation")
        try:
            registry.functions.submitProof(*a).call({"from": acct.address})
            return {"accepted": True, "reason": None}
        except Exception as e:
            return {"accepted": False, "reason": _friendly_error(e)}

    return {
        "real_proof": attempt(args[2]),
        "tampered_proof": attempt(tamper(args[2])),
    }
