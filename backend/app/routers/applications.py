from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.db_models import Application, ProofRecord
from app.schemas import LoanApplicationCreate, ApplicationResponse, ApplicationDetail, ProofGenerateResponse
from app.inference import get_model
from app.proof_pipeline import generate_proof_for_application, run_tamper_demo, ProofPipelineError

router = APIRouter(prefix="/applications", tags=["applications"])


def _to_response(app_row: Application) -> dict:
    return {
        "id": app_row.id,
        "bank_id": app_row.bank_id,
        "decision": app_row.decision,
        "prediction_score": app_row.prediction_score,
        "proof_status": app_row.proof_status,
        "onchain_tx_hash": app_row.onchain_tx_hash,
        "created_at": app_row.created_at.isoformat(),
    }


@router.post("", response_model=ApplicationResponse)
def submit_application(payload: LoanApplicationCreate, db: Session = Depends(get_db)):
    """Customer submits a loan application. Runs model inference immediately
    (off-chain, same as the real ZK circuit will later do) and stores the
    result. Proof generation is a separate step (see /applications/{id}/generate-proof)."""
    model = get_model()
    raw_input = payload.model_dump()
    result = model.predict(raw_input)

    row = Application(
        raw_input=raw_input,
        prediction_score=result["prediction_score"],
        decision=result["decision"],
        proof_status="not_started",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_response(row)


@router.get("/{application_id}", response_model=ApplicationDetail)
def get_application(application_id: str, db: Session = Depends(get_db)):
    row = db.query(Application).filter(Application.id == application_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Application not found")
    resp = _to_response(row)
    resp["raw_input"] = row.raw_input
    resp["model_version_id"] = row.model_version_id
    return resp


@router.get("", response_model=list[ApplicationResponse])
def list_applications(db: Session = Depends(get_db)):
    rows = db.query(Application).order_by(Application.created_at.desc()).all()
    return [_to_response(r) for r in rows]


@router.post("/{application_id}/generate-proof", response_model=ProofGenerateResponse)
def generate_proof(application_id: str, db: Session = Depends(get_db)):
    """Runs the real EZKL pipeline for this application: preprocesses its data
    exactly like inference did, generates a witness, proves, and verifies —
    all locally (not yet submitted on-chain — that's a separate future step).
    Reuses the model's fixed proving/verifying keys generated once via
    training/generate_proof.py."""
    row = db.query(Application).filter(Application.id == application_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Application not found")

    row.proof_status = "pending"
    db.commit()

    try:
        result = generate_proof_for_application(row.id, row.raw_input)
    except ProofPipelineError as e:
        row.proof_status = "failed"
        db.add(ProofRecord(application_id=row.id, status="failed", detail=str(e)))
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))

    row.proof_status = "proven" if result["verified"] else "failed"
    row.proof_path = result["proof_path"]
    db.add(ProofRecord(
        application_id=row.id,
        status="success" if result["verified"] else "failed",
        detail=f"Proved and verified locally in {result['elapsed_seconds']}s",
    ))
    db.commit()
    db.refresh(row)

    message = (
        f"Proof generated and verified locally in {result['elapsed_seconds']}s. "
        "Not yet submitted on-chain."
        if result["verified"]
        else "Proof was generated but local verification failed."
    )

    return ProofGenerateResponse(
        application_id=row.id,
        proof_status=row.proof_status,
        message=message,
    )


@router.post("/{application_id}/tamper-demo")
def tamper_demo(application_id: str, db: Session = Depends(get_db)):
    """Educational endpoint, not a security feature. A legitimately-generated
    ZK proof always verifies successfully — that's the point of the system,
    not a bug — so without this, users never see a failing verification and
    can't tell the check is doing real work. This takes the application's
    already-generated real proof, corrupts a COPY of it (flips one byte),
    and re-verifies both side by side so the difference is visible."""
    row = db.query(Application).filter(Application.id == application_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Application not found")
    if row.proof_status not in ("proven", "verified"):
        raise HTTPException(
            status_code=400,
            detail="Generate a proof for this application first before running the tamper demo.",
        )

    try:
        result = run_tamper_demo(row.id)
    except ProofPipelineError as e:
        raise HTTPException(status_code=500, detail=str(e))

    return result