from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
import sys
import logging
import time
import json

# Configure logging
logger = logging.getLogger(__name__)

# Define and export the router
router = APIRouter()

# 1. Force Python to find the worker file (for the app config)
sys.path.append("/app")
from worker import celery_app
from celery.result import AsyncResult
from celery.exceptions import TimeoutError as CeleryTimeoutError
from database import get_db
from models import User, Consultation
from routers.auth import get_current_user
import os

# Verify Redis configuration matches worker
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
logger.info(f"Backend Disease Router initialized")
logger.info(f"Environment REDIS_URL: {REDIS_URL}")
logger.info(f"Celery app result_backend: {celery_app.conf.result_backend}")
# Verify they match
if celery_app.conf.result_backend != REDIS_URL:
    logger.warning(f"Mismatch: Celery backend ({celery_app.conf.result_backend}) != Env REDIS_URL ({REDIS_URL})")
else:
    logger.info("✓ Redis URL configuration matches")

class SymptomInput(BaseModel):
    text: str

@router.post("/predict")
async def predict_disease_endpoint(
    data: SymptomInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit symptoms for AI diagnosis analysis.
    Returns a task_id that can be used to retrieve results.
    """
    try:
        logger.info(f"Received diagnosis request from user_id={current_user.id}")
        
        # Create a new Consultation record
        new_consultation = Consultation(
            user_id=current_user.id,
            symptoms=data.text,
            diagnosis='Pending'
        )
        
        db.add(new_consultation)
        db.commit()
        db.refresh(new_consultation)
        
        logger.info(f"Created consultation_id={new_consultation.id} for user_id={current_user.id}")
        
        # 2. Send task with both symptoms and consultation_id for database update
        # Pass consultation_id so the worker can update the database directly
        try:
            task = celery_app.send_task(
                "predict_disease", 
                args=[data.text],  # symptoms (serializable string)
                kwargs={"consultation_id": new_consultation.id}  # consultation_id for DB update
            )
            logger.info(f"Task sent: task_id={task.id}, consultation_id={new_consultation.id}")
        except Exception as task_err:
            logger.error(f"Failed to send task to Celery: {task_err}", exc_info=True)
            # Update consultation with error
            new_consultation.diagnosis = f"Error: Failed to queue task - {str(task_err)}"
            db.commit()
            raise HTTPException(status_code=500, detail=f"Failed to queue diagnosis task: {str(task_err)}")
        
        return {
            "task_id": task.id,
            "consultation_id": new_consultation.id,
            "status": "Processing"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in predict_disease_endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/result/{task_id}")
async def get_result(
    task_id: str,
    consultation_id: int = None,
    timeout: int = 60,
    db: Session = Depends(get_db)
):
    """
    Get the result of a diagnosis task.
    
    Args:
        task_id: The Celery task ID
        consultation_id: Optional consultation ID to update
        timeout: Maximum time to wait for result (seconds, default 60)
        db: Database session
    
    Returns:
        Task status and result if available
    """
    try:
        logger.info(f"Requesting result for task_id={task_id}, consultation_id={consultation_id}, timeout={timeout}s")
        
        task = AsyncResult(task_id, app=celery_app)
        
        # Wait for task completion with timeout
        try:
            # Use get() with timeout to wait for result (blocking until ready or timeout)
            # timeout=None means wait indefinitely, but we'll use the provided timeout
            # However, get() with timeout can raise, so we need to handle that
            result = task.get(timeout=timeout, propagate=False)
            
            # Check task state after getting result
            state = task.state
            
            logger.info(f"Task task_id={task_id} state={state}")
            
            # Handle different task states
            if state == 'SUCCESS':
                # Task completed successfully
                diagnosis_text = result if result else "No result returned"
                
                # Update consultation in database if consultation_id provided
                if consultation_id is not None:
                    try:
                        consultation = db.query(Consultation).filter(Consultation.id == consultation_id).first()
                        if consultation:
                            # Ensure we store a string in the database
                            if isinstance(diagnosis_text, (dict, list)):
                                db_diagnosis = json.dumps(diagnosis_text)
                            else:
                                db_diagnosis = str(diagnosis_text)
                                
                            consultation.diagnosis = db_diagnosis
                            db.commit()
                            logger.info(f"Updated consultation_id={consultation_id} with diagnosis")
                        else:
                            logger.warning(f"Consultation_id={consultation_id} not found in database")
                    except Exception as db_err:
                        logger.error(f"Failed to update consultation_id={consultation_id}: {db_err}", exc_info=True)
                        db.rollback()
                
                return {
                    "task_id": task_id,
                    "status": "SUCCESS",
                    "result": diagnosis_text,
                    "consultation_id": consultation_id
                }
                
            elif state == 'FAILURE':
                # Task failed
                error_info = str(task.info) if task.info else "Unknown error"
                logger.error(f"Task task_id={task_id} failed: {error_info}")
                
                # Update consultation with error if consultation_id provided
                if consultation_id is not None:
                    try:
                        consultation = db.query(Consultation).filter(Consultation.id == consultation_id).first()
                        if consultation:
                            consultation.diagnosis = f"Error: {error_info}"
                            db.commit()
                    except Exception as db_err:
                        logger.error(f"Failed to update consultation with error: {db_err}")
                        db.rollback()
                
                return {
                    "task_id": task_id,
                    "status": "FAILURE",
                    "result": None,
                    "error": error_info,
                    "consultation_id": consultation_id
                }
                
            elif state == 'PENDING':
                # Task still pending (shouldn't happen if we waited, but handle it)
                logger.info(f"Task task_id={task_id} is still PENDING after wait")
                return {
                    "task_id": task_id,
                    "status": "PENDING",
                    "result": None,
                    "message": "Task is still processing. Please try again later.",
                    "consultation_id": consultation_id
                }
                
            elif state in ['RETRY', 'STARTED']:
                # Task is retrying or started
                logger.info(f"Task task_id={task_id} is in state {state}")
                return {
                    "task_id": task_id,
                    "status": state,
                    "result": None,
                    "message": f"Task is {state.lower()}. Please check again shortly.",
                    "consultation_id": consultation_id
                }
                
            else:
                # Unknown state
                logger.warning(f"Task task_id={task_id} has unknown state: {state}")
                return {
                    "task_id": task_id,
                    "status": state,
                    "result": None,
                    "message": f"Task is in state: {state}",
                    "consultation_id": consultation_id
                }
                
        except CeleryTimeoutError:
            # Timeout waiting for result
            logger.warning(f"Timeout waiting for task_id={task_id} after {timeout}s")
            # Try to get the current state without waiting
            try:
                current_state = task.state
                logger.info(f"Task task_id={task_id} current state after timeout: {current_state}")
                return {
                    "task_id": task_id,
                    "status": current_state if current_state else "PENDING",
                    "result": None,
                    "message": f"Task is still processing. Timeout after {timeout} seconds. Current state: {current_state}. Please try again later.",
                    "consultation_id": consultation_id
                }
            except Exception as state_err:
                logger.error(f"Failed to get task state after timeout: {state_err}")
                return {
                    "task_id": task_id,
                    "status": "PENDING",
                    "result": None,
                    "message": f"Task is still processing. Timeout after {timeout} seconds. Please try again later.",
                    "consultation_id": consultation_id
                }
            
        except Exception as get_err:
            # Error getting result (could be connection error, etc.)
            error_type = type(get_err).__name__
            logger.error(f"Error getting result for task_id={task_id}: {error_type}: {get_err}", exc_info=True)
            
            # Try to get task state to see if it's a connection issue
            try:
                current_state = task.state
                logger.info(f"Task task_id={task_id} current state: {current_state}")
                # If we can get the state, it's not a connection issue
                return {
                    "task_id": task_id,
                    "status": "ERROR",
                    "result": None,
                    "error": f"Failed to retrieve task result: {str(get_err)}",
                    "consultation_id": consultation_id
                }
            except Exception as state_err:
                # If we can't even get the state, it's likely a Redis connection issue
                logger.error(f"Cannot connect to Redis/result backend: {state_err}")
                return {
                    "task_id": task_id,
                    "status": "ERROR",
                    "result": None,
                    "error": f"Cannot connect to result backend (Redis). This may indicate a connection issue. Error: {str(get_err)}",
                    "consultation_id": consultation_id
                }
            
    except Exception as e:
        logger.error(f"Unexpected error in get_result endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/history")
async def get_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the medical history (consultations) for the current user.
    """
    consultations = db.query(Consultation).filter(Consultation.user_id == current_user.id).all()
    return consultations