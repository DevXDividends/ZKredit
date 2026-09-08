from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from app import ocr
from app.auth import get_current_user
from app.db_models import User
from app.schemas import OcrApplicationExtraction, OcrTestPdfResponse

router = APIRouter(prefix="/ocr", tags=["ocr"])


@router.post("/extract-application", response_model=OcrApplicationExtraction)
async def extract_application(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Upload a PDF file.")

    pdf_bytes = await file.read()
    if len(pdf_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="PDF must be under 10MB.")

    result = ocr.extract_application_from_pdf(pdf_bytes)
    return OcrApplicationExtraction(**result)


@router.get("/generate-test-pdf", response_model=OcrTestPdfResponse)
def generate_test_pdf(current_user: User = Depends(get_current_user)):
    """Renders a fabricated loan-application PDF with known values, so the
    extraction endpoint above can be tested end-to-end without a real
    document — compare its response against this call's ground_truth."""
    result = ocr.generate_test_pdf()
    return OcrTestPdfResponse(**result)