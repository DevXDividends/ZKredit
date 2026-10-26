"""Unit tests for the pure (no-network) parts of app/onchain.py, using the
real committed proof.json."""
import json
from pathlib import Path

import pytest

from app import onchain

PROOF = Path(__file__).resolve().parents[2] / "circuits" / "loan_model" / "proof.json"

pytestmark = pytest.mark.skipif(not PROOF.exists(), reason="circuits/loan_model/proof.json not present")


@pytest.fixture
def proof_json():
    return onchain.load_proof_json(str(PROOF))


def test_instances_are_decoded_little_endian(proof_json):
    inst = onchain.instances_to_ints(proof_json)
    assert len(inst) == 28
    assert inst[0] == 0xA5          # 'a500..00' little-endian -> 165
    assert inst[-1] == 162          # model output, 162/4096 ~ 3.96%


def test_proof_bytes_match_hex_proof(proof_json):
    assert onchain.proof_bytes(proof_json) == bytes.fromhex(proof_json["hex_proof"][2:])


def test_decision_threshold():
    assert onchain.decision_from_instances([0, 0, 162]) == 0      # 3.96% -> Rejected
    assert onchain.decision_from_instances([0, 0, 2048]) == 1     # exactly 0.5 -> Approved
    assert onchain.decision_from_instances([0, 0, 2047]) == 0


def test_tamper_changes_exactly_one_byte(proof_json):
    p = onchain.proof_bytes(proof_json)
    t = onchain.tamper(p)
    assert len(t) == len(p)
    assert sum(1 for a, b in zip(p, t) if a != b) == 1


def test_hashes_are_deterministic_and_order_independent():
    pytest.importorskip("web3")
    a = onchain.application_hash_bytes({"x": 1, "y": 2})
    b = onchain.application_hash_bytes({"y": 2, "x": 1})
    assert a == b and len(a) == 32
    assert onchain.application_id_bytes("abc") != onchain.application_id_bytes("abd")


def test_disabled_by_default(monkeypatch):
    monkeypatch.delenv("ONCHAIN_ENABLED", raising=False)
    assert onchain.is_enabled() is False
    s = onchain.get_status()
    assert s["enabled"] is False and s["connected"] is False
    with pytest.raises(onchain.OnchainError):
        onchain.submit_proof_onchain("id", {}, str(PROOF))
