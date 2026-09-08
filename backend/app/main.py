from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from app.database import Base, engine
from app.routers import applications, bank, fairness, auth, ocr
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ZKredit API",
    description="Zero-Knowledge Proof Based Fair Lending Verification System — backend orchestration API",
    version="0.1.0",
)

# CORS: local dev origins + any extra origins from env + any *.vercel.app deployment

_default_origins = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
_allowed_origins = os.environ.get("ALLOWED_ORIGINS", _default_origins).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(applications.router)
app.include_router(bank.router)
app.include_router(fairness.router)
app.include_router(ocr.router)
@app.on_event("startup")
async def ensure_srs_cached():
    """Pre-warms the KZG SRS cache so the first /generate-proof call isn't
    slow. Safe to call every startup — it's a fast no-op if already cached.
    Failures here are logged, not fatal — inference/other endpoints still
    work fine without it; only proof generation needs the SRS."""
    try:
        from app.proof_pipeline import ensure_srs_downloaded
        await ensure_srs_downloaded()
    except Exception as e:
        print(f"[startup] SRS pre-warm skipped: {e}")


@app.get("/")
def root():
    return {"status": "ok", "service": "ZKredit API"}


@app.get("/health")
def health():
    return {"status": "healthy"}