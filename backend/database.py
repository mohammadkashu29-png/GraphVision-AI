from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from config import DB_PATH

engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


def utcnow():
    return datetime.now(timezone.utc)


class HandwritingAnalysis(Base):
    __tablename__ = "handwriting_analyses"

    id = Column(Integer, primary_key=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    filename = Column(String, nullable=False)
    original_image = Column(String, nullable=False)   # stored in backend/data/uploads
    processed_image = Column(String, nullable=False)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    processing_time_ms = Column(Float, nullable=True)
    result_json = Column(Text, nullable=False)        # features + charts + preprocessing


class SignatureVerification(Base):
    __tablename__ = "signature_verifications"

    id = Column(Integer, primary_key=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    filename_a = Column(String, nullable=False)
    filename_b = Column(String, nullable=False)
    distance = Column(Float, nullable=False)
    threshold = Column(Float, nullable=False)
    predicted_same = Column(Boolean, nullable=False)
    processing_time_ms = Column(Float, nullable=True)
    result_json = Column(Text, nullable=True)


Base.metadata.create_all(engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
