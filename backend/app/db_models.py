import uuid
from datetime import datetime

from sqlalchemy import Column, String, Float, Integer, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


def gen_uuid():
    return str(uuid.uuid4())


class Application(Base):
    """A single loan application. `raw_input` stores the customer's submitted
    fields (private in a real deployment — here it's plaintext for the demo;
    Section 4.4 notes only a *hash/commitment* of this should ever be public).
    """
    __tablename__ = "applications"

    id = Column(String, primary_key=True, default=gen_uuid)
    bank_id = Column(String, default="demo-bank")
    model_version_id = Column(Integer, default=1)

    # Raw customer-submitted fields, matching the Kaggle schema
    raw_input = Column(JSON, nullable=False)

    # Model outputs (computed off-chain by inference.py)
    prediction_score = Column(Float, nullable=True)     # sigmoid output, 0-1
    decision = Column(String, nullable=True)             # "Approved" / "Rejected"

    # ZK proof pipeline status — filled in once Phase 3 (EZKL) is integrated
    proof_status = Column(String, default="not_started")  # not_started | pending | generated | verified | failed
    proof_path = Column(String, nullable=True)
    onchain_tx_hash = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    proofs = relationship("ProofRecord", back_populates="application")


class ProofRecord(Base):
    """Audit log of proof-generation attempts for an application (an
    application could have multiple attempts if proving fails/retries)."""
    __tablename__ = "proof_records"

    id = Column(String, primary_key=True, default=gen_uuid)
    application_id = Column(String, ForeignKey("applications.id"), nullable=False)
    status = Column(String, default="pending")  # pending | success | failed
    detail = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    application = relationship("Application", back_populates="proofs")
