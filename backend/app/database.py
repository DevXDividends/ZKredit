"""Database setup — SQLite for dev (docs mention PostgreSQL/MongoDB for prod,
but SQLite needs zero setup and is a drop-in swap later via DATABASE_URL)."""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{BASE_DIR}/zkredit.db")

# Newer SQLAlchemy (2.1+) treats a bare "postgresql://" as the psycopg3 driver,
# but this project installs psycopg2-binary. Pin the driver explicitly so the
# app works regardless of which SQLAlchemy version pip resolves.
for _prefix in ("postgres://", "postgresql://"):
    if DATABASE_URL.startswith(_prefix):
        DATABASE_URL = "postgresql+psycopg2://" + DATABASE_URL[len(_prefix):]
        break

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

# pool_pre_ping: har use se pehle connection check karta hai (Neon idle connections band kar deta hai).
# pool_recycle: 5 minute se purane connections refresh ho jaate hain.
engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_recycle=300,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()