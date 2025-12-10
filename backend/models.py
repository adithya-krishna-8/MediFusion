from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String, nullable=True)
    age = Column(Integer, nullable=True)
    height = Column(String, nullable=True) # e.g. "180 cm"
    weight = Column(String, nullable=True) # e.g. "75 kg"
    blood_type = Column(String, nullable=True)
    role = Column(String, default="patient")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship to consultations
    consultations = relationship("Consultation", back_populates="owner")

class Consultation(Base):
    __tablename__ = "consultations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    symptoms = Column(String)
    diagnosis = Column(String, default="Pending")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Relationship to user
    owner = relationship("User", back_populates="consultations")
