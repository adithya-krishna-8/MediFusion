from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import Medicine, User
from routers.auth import get_current_user
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

# Pydantic Models
class MedicineCreate(BaseModel):
    name: str
    dosage: str
    frequency: str
    reminder_time: str # HH:MM

class MedicineOut(MedicineCreate):
    id: int
    is_active: int

    class Config:
        orm_mode = True

@router.post("/medicines", response_model=MedicineOut, status_code=status.HTTP_201_CREATED)
async def create_medicine(
    med: MedicineCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    new_med = Medicine(
        name=med.name,
        dosage=med.dosage,
        frequency=med.frequency,
        reminder_time=med.reminder_time,
        user_id=current_user.id,
        is_active=1
    )
    db.add(new_med)
    db.commit()
    db.refresh(new_med)
    return new_med

@router.get("/medicines", response_model=List[MedicineOut])
async def get_medicines(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Medicine).filter(Medicine.user_id == current_user.id).all()

@router.delete("/medicines/{medicine_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_medicine(
    medicine_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    med = db.query(Medicine).filter(Medicine.id == medicine_id, Medicine.user_id == current_user.id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medicine not found")
    
    db.delete(med)
    db.commit()
    return None
