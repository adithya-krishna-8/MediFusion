from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db
from models import User
from passlib.context import CryptContext
from jose import JWTError, jwt
from pydantic import BaseModel
from typing import Optional
import os
from celery import Celery # Import Celery to send tasks

# Define and export the router
router = APIRouter()

# CONFIG
SECRET_KEY = "supersecretkey" # Simplify for now
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# THE CRITICAL LINE: Pointing to /api/login
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

# Helper Functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# 1. LOGIN ENDPOINT
@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

# 2. SIGNUP ENDPOINT
@router.post("/signup", status_code=201)
async def signup(user_data: dict, db: Session = Depends(get_db)): 
    # Simplified dict input to avoid Pydantic import issues for this fix
    # In real code use Pydantic models
    email = user_data.get("email")
    password = user_data.get("password")
    full_name = user_data.get("full_name")
    age = user_data.get("age")
    role = user_data.get("role", "patient")
    hospital_name = user_data.get("hospital_name")
    certifications = user_data.get("certifications")
    
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(password)
    new_user = User(
        email=email,
        hashed_password=hashed_password,
        full_name=full_name,
        age=age,
        role=role,
        hospital_name=hospital_name,
        certifications=certifications
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create and return access token (same as login)
    access_token = create_access_token(data={"sub": new_user.email})

    # TRIGGER WELCOME EMAIL (Async)
    try:
        # Create a transient Celery instance just for sending the message
        # This avoids complex imports from worker.py
        # Create a transient Celery instance matching the worker's app name
        celery_client = Celery(
            "medifusion_worker", 
            broker=os.getenv("RABBITMQ_URL", "amqp://admin:admin@rabbitmq:5672/")
        )
        # Send task by name
        celery_client.send_task(
            "send_welcome_email", 
            args=[new_user.email, new_user.full_name]
        )
        print(f"Task 'send_welcome_email' sent to broker for {new_user.email}")
    except Exception as e:
        # Don't fail the signup if email fails to queue
        print(f"Failed to queue welcome email: {e}")

    return {"access_token": access_token, "token_type": "bearer"}

# 3. GET CURRENT USER
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

# Pydantic Model for Update
class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    age: Optional[int] = None
    height: Optional[str] = None
    weight: Optional[str] = None
    blood_type: Optional[str] = None

# 4. GET PROFILE
@router.get("/me")
async def read_users_me(current_user: User = Depends(get_current_user)):
    return {
        "email": current_user.email,
        "full_name": current_user.full_name,
        "age": current_user.age,
        "height": current_user.height,
        "weight": current_user.weight,
        "blood_type": current_user.blood_type,
        "role": current_user.role
    }

# 5. UPDATE PROFILE
@router.put("/me")
async def update_user_me(user_update: UserProfileUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
    if user_update.age is not None:
        current_user.age = user_update.age
    if user_update.height is not None:
        current_user.height = user_update.height
    if user_update.weight is not None:
        current_user.weight = user_update.weight
    if user_update.blood_type is not None:
        current_user.blood_type = user_update.blood_type
    
    db.commit()
    db.refresh(current_user)
    return {
        "email": current_user.email,
        "full_name": current_user.full_name,
        "age": current_user.age,
        "height": current_user.height,
        "weight": current_user.weight,
        "blood_type": current_user.blood_type,
        "role": current_user.role
    }