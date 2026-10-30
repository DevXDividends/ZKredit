from fastapi import APIRouter, Depends, HTTPException

from app import xai
from app.auth import get_current_user
from app.database import get_db
from app.db_models import User
from app.routers.applications import _get_owned_application
from app.schemas import LoanApplicationCreate
from sqlalchemy.orm import Session

router = APIRouter(prefix="/xai", tags=["explainability"])


@router.get("/{application_id}")
def explain_application(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Why was this application approved/rejected? Per-field SHAP contributions."""
    row = _get_owned_application(application_id, current_user, db)
    try:
        result = xai.explain(row.raw_input)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    result["application_id"] = row.id
    return result


@router.post("/what-if")
def what_if(payload: LoanApplicationCreate, current_user: User = Depends(get_current_user)):
    """Explain an arbitrary input without saving it (for 'what if I change X?')."""
    try:
        return xai.explain(payload.model_dump())
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
