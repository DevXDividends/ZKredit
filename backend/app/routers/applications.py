from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.db_models import Application, ProofRecord
from app.schemas import LoanApplicationCreate, ApplicationResponse, ApplicationDetail, ProofGenerateResponse
from app.inference import get_model

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
    """Stub for the EZKL proof pipeline (Phase 3). Currently marks the
    application as 'pending' — swap this function's body for the real
    ezkl.gen_witness / prove / verify calls once that pipeline is unblocked."""
    row = db.query(Application).filter(Application.id == application_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Application not found")

    # TODO(Phase 3 integration): call ezkl gen_witness -> prove -> verify here,
    # using row.raw_input run through inference.LoanModel.preprocess() as the
    # circuit's private input, save the resulting proof.json, and update
    # row.proof_path + row.proof_status = "generated".
    row.proof_status = "pending"
    db.add(ProofRecord(application_id=row.id, status="pending", detail="ZK pipeline not yet integrated"))
    db.commit()

    return ProofGenerateResponse(
        application_id=row.id,
        proof_status=row.proof_status,
        message="Proof generation is stubbed — ZK pipeline integration pending (Phase 3).",
    )
