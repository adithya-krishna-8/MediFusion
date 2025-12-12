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
    role = Column(String, default="patient") # "patient" or "doctor"
    hospital_name = Column(String, nullable=True) # For doctors
    certifications = Column(String, nullable=True) # For doctors
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship to consultations
    # Relationship to consultations and medicines
    consultations = relationship("Consultation", back_populates="owner")
    medicines = relationship("Medicine", back_populates="owner")

class Medicine(Base):
    __tablename__ = "medicines"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, index=True)
    dosage = Column(String)      # e.g., "500mg"
    frequency = Column(String)   # e.g., "Daily"
    reminder_time = Column(String)  # HH:MM format (24hr), e.g. "09:00"
    is_active = Column(Integer, default=1) # 1=Active, 0=Inactive (Using Integer for simplicity or Boolean if supported)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="medicines")

class Consultation(Base):
    __tablename__ = "consultations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    symptoms = Column(String)
    diagnosis = Column(String, default="Pending")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Relationship to user
    owner = relationship("User", back_populates="consultations")
