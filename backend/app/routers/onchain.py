from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import onchain
from app.auth import get_current_user
from app.database import get_db
from app.db_models import ProofRecord, User
from app.routers.applications import _get_owned_application

router = APIRouter(prefix="/onchain", tags=["onchain"])


@router.get("/status")
def onchain_status():
    """Public, secret-free: lets the frontend decide whether to show the
    'Submit On-Chain' button. Never raises."""
    return onchain.get_status()


def _require_proof(row):
    if row.proof_status not in ("proven", "verified") or not row.proof_path:
        raise HTTPException(
            status_code=400,
            detail="Generate a proof for this application first.",
        )


@router.post("/{application_id}/submit")
def submit_onchain(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Sends the application's real ZK proof to the LoanApplicationRegistry.
    The smart contract runs the Halo2 verifier; only if it accepts is the
    application recorded. On success we store the tx hash and mark the
    application 'verified' (= verified on-chain)."""
    row = _get_owned_application(application_id, current_user, db)
    _require_proof(row)

    if row.onchain_tx_hash:
        raise HTTPException(status_code=409, detail="Already submitted on-chain.")

    try:
        result = onchain.submit_proof_onchain(
            row.id, row.raw_input, row.proof_path, row.model_version_id or 1
        )
    except onchain.OnchainError as e:
        db.add(ProofRecord(application_id=row.id, status="failed", detail=f"On-chain: {e}"))
        db.commit()
        raise HTTPException(status_code=502, detail=str(e))

    row.onchain_tx_hash = result["tx_hash"]
    row.proof_status = "verified"
    db.add(ProofRecord(
        application_id=row.id,
        status="success",
        detail=f"Verified on-chain in block {result['block_number']} (gas {result['gas_used']}), tx {result['tx_hash']}",
    ))
    db.commit()
    return result


@router.post("/{application_id}/tamper-check")
def onchain_tamper_check(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Demo: asks the chain to verify the real proof and a 1-byte-flipped copy.
    Uses eth_call (a dry run): no transaction, no gas, nothing is recorded."""
    row = _get_owned_application(application_id, current_user, db)
    _require_proof(row)
    try:
        return onchain.simulate_tampered(
            row.id, row.raw_input, row.proof_path, row.model_version_id or 1
        )
    except onchain.OnchainError as e:
        raise HTTPException(status_code=502, detail=str(e))
