from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.db_models import Application

router = APIRouter(prefix="/bank", tags=["bank"])


@router.get("/summary")
def bank_summary(db: Session = Depends(get_db)):
    total = db.query(func.count(Application.id)).scalar() or 0
    approved = db.query(func.count(Application.id)).filter(Application.decision == "Approved").scalar() or 0
    rejected = db.query(func.count(Application.id)).filter(Application.decision == "Rejected").scalar() or 0
    proofs_generated = db.query(func.count(Application.id)).filter(
        Application.proof_status.in_(["generated", "verified"])
    ).scalar() or 0

    return {
        "total_applications": total,
        "approved": approved,
        "rejected": rejected,
        "approval_rate": round(approved / total, 4) if total else None,
        "proofs_generated": proofs_generated,
    }


@router.get("/applications")
def bank_applications(db: Session = Depends(get_db)):
    rows = db.query(Application).order_by(Application.created_at.desc()).all()
    return [
        {
            "id": r.id,
            "decision": r.decision,
            "prediction_score": r.prediction_score,
            "proof_status": r.proof_status,
            "created_at": r.created_at.isoformat(),
        }
        for r in rows
    ]
