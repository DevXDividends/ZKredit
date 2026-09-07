from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db, SessionLocal
from app.db_models import Application, ProofRecord, User
from app.schemas import LoanApplicationCreate, ApplicationResponse, ApplicationDetail, ProofGenerateResponse
from app.inference import get_model
from app.proof_pipeline import generate_proof_for_application, run_tamper_demo, ProofPipelineError
from app.auth import get_current_user

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


def _get_owned_application(application_id: str, current_user: User, db: Session) -> Application:
    row = db.query(Application).filter(Application.id == application_id).first()
    if not row or row.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Application not found")
    return row


@router.post("", response_model=ApplicationResponse)
def submit_application(
    payload: LoanApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    model = get_model()
    raw_input = payload.model_dump()
    result = model.predict(raw_input)

    row = Application(
        user_id=current_user.id,
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
def get_application(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = _get_owned_application(application_id, current_user, db)
    resp = _to_response(row)
    resp["raw_input"] = row.raw_input
    resp["model_version_id"] = row.model_version_id
    return resp


@router.get("", response_model=list[ApplicationResponse])
def list_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(Application)
        .filter(Application.user_id == current_user.id)
        .order_by(Application.created_at.desc())
        .all()
    )
    return [_to_response(r) for r in rows]


def _run_proof_generation_job(application_id: str, raw_input: dict):
    """Runs in a background thread (via FastAPI's BackgroundTasks), AFTER the
    HTTP response has already been sent — needed because real proof
    generation can take longer than Render's ~60s proxy timeout allows for a
    single synchronous request. Needs its own DB session since the
    request-scoped one is already closed by the time this runs."""
    db = SessionLocal()
    try:
        row = db.query(Application).filter(Application.id == application_id).first()
        if not row:
            return
        try:
            result = generate_proof_for_application(application_id, raw_input)
            row.proof_status = "proven" if result["verified"] else "failed"
            row.proof_path = result["proof_path"]
            db.add(ProofRecord(
                application_id=application_id,
                status="success" if result["verified"] else "failed",
                detail=f"Proved and verified in {result['elapsed_seconds']}s",
            ))
        except ProofPipelineError as e:
            row.proof_status = "failed"
            db.add(ProofRecord(application_id=application_id, status="failed", detail=str(e)))
        db.commit()
    finally:
        db.close()


@router.post("/{application_id}/generate-proof", response_model=ProofGenerateResponse)
def generate_proof(
    application_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Kicks off proof generation in the background and returns immediately
    with 'pending'. Poll GET /applications/{id} to see when it finishes —
    this avoids platform request-timeout limits (e.g. Render's ~60s proxy
    timeout) that a long-running synchronous request would hit."""
    row = _get_owned_application(application_id, current_user, db)

    row.proof_status = "pending"
    db.commit()

    background_tasks.add_task(_run_proof_generation_job, row.id, row.raw_input)

    return ProofGenerateResponse(
        application_id=row.id,
        proof_status="pending",
        message="Proof generation started in the background — this can take a minute or two. Poll this application's status to see when it's done.",
    )


@router.post("/{application_id}/tamper-demo")
def tamper_demo(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = _get_owned_application(application_id, current_user, db)
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