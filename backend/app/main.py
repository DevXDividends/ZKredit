from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import applications, bank, fairness

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ZKredit API",
    description="Zero-Knowledge Proof Based Fair Lending Verification System — backend orchestration API",
    version="0.1.0",
)

# CORS: allow local frontend dev servers (Vite default is 5173, CRA is 3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(applications.router)
app.include_router(bank.router)
app.include_router(fairness.router)
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
