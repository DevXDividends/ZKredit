import uuid
from datetime import datetime

from sqlalchemy import Column, String, Float, Integer, DateTime, JSON, ForeignKey, Boolean
from sqlalchemy.orm import relationship

from app.database import Base


def gen_uuid():
    return str(uuid.uuid4())


class User(Base):
    """An applicant account. Supports two sign-in methods: email+password
    (hashed_password set, auth_provider='local') and Google OAuth
    (google_id set, auth_provider='google'). A user could in principle have
    both set if they link Google to an existing local account by signing
    in with Google using the same email."""
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    full_name = Column(String, nullable=True)
    hashed_password = Column(String, nullable=True)  # null for Google-only accounts
    google_id = Column(String, unique=True, nullable=True, index=True)
    auth_provider = Column(String, default="local")  # "local" | "google"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    applications = relationship("Application", back_populates="user")


class Application(Base):
    """A single loan application. `raw_input` stores the customer's submitted
    fields (private in a real deployment — here it's plaintext for the demo;
    Section 4.4 notes only a *hash/commitment* of this should ever be public).
    """
    __tablename__ = "applications"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    bank_id = Column(String, default="demo-bank")
    model_version_id = Column(Integer, default=1)

    # Raw customer-submitted fields, matching the Kaggle schema
    raw_input = Column(JSON, nullable=False)

    # Model outputs (computed off-chain by inference.py)
    prediction_score = Column(Float, nullable=True)     # sigmoid output, 0-1
    decision = Column(String, nullable=True)             # "Approved" / "Rejected"

    # ZK proof pipeline status
    proof_status = Column(String, default="not_started")  # not_started | pending | proven | verified | failed
    proof_path = Column(String, nullable=True)
    onchain_tx_hash = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="applications")
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