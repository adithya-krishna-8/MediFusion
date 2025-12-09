import os
import sys
import time
import json
import logging
import google.generativeai as genai
from celery import Celery
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Consultation, Base
from dotenv import load_dotenv

# CRITICAL: Load environment variables from .env file BEFORE reading them
# This ensures GEMINI_API_KEY and other variables are available
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 1. Configuration (Env variables)
# These are read AFTER load_dotenv() to ensure .env file is loaded
RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://admin:admin@rabbitmq:5672/")
# CRITICAL: Use Docker service name 'redis' for Redis connection
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")  # Changed to 1.5-flash for better stability
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://medifusion_user:securepassword123@db:5432/medifusion_db")

# Log configuration at startup
logger.info(f"Celery Broker URL: {RABBITMQ_URL}")
logger.info(f"Celery Backend (Redis) URL: {REDIS_URL}")
logger.info(f"Database URL: {DATABASE_URL[:30]}...")  # Log partial URL for security

# Configure Gemini API (will be re-validated at task execution time)
# CRITICAL: Verify API key is loaded from environment
if GEMINI_API_KEY:
    # Validate API key format (should start with AIza)
    if not GEMINI_API_KEY.strip():
        logger.error("GEMINI_API_KEY is empty or whitespace only")
        GEMINI_API_KEY = None
    elif len(GEMINI_API_KEY.strip()) < 20:
        logger.warning(f"GEMINI_API_KEY appears to be too short ({len(GEMINI_API_KEY)} chars)")
    else:
        try:
            genai.configure(api_key=GEMINI_API_KEY)
            logger.info("✓ Gemini API configured successfully at startup")
            logger.debug(f"GEMINI_API_KEY loaded (length: {len(GEMINI_API_KEY)}, starts with: {GEMINI_API_KEY[:5]}...)")
        except Exception as e:
            logger.error(f"Failed to configure Gemini API at startup: {e}", exc_info=True)
            logger.info("Will retry configuration at task execution time")
else:
    logger.error("GEMINI_API_KEY not found in environment variables at startup")
    logger.error("Please ensure GEMINI_API_KEY is set in .env file or environment")
    logger.info("Will check for GEMINI_API_KEY at task execution time")

# 2. Setup Database Connection for Worker
try:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=3600)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    logger.info("✓ Database connection configured for worker")
except Exception as e:
    logger.warning(f"Failed to configure database connection: {e}")
    SessionLocal = None

# 3. Setup Celery App
# CRITICAL: broker (RabbitMQ) is for task queuing, backend (Redis) is for result storage
celery_app = Celery(
    "medifusion_worker",
    broker=RABBITMQ_URL,
    backend=REDIS_URL  # Using Redis for result backend - must match Docker service name 'redis'
)
logger.info("Celery app initialized")

# Configure Celery task settings with resilience options
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes hard timeout (generous for AI API calls)
    task_soft_time_limit=280,  # 4 minutes 40 seconds soft timeout
    task_acks_late=True,  # Acknowledge tasks after completion, not before
    task_reject_on_worker_lost=True,  # Re-queue tasks if worker dies
    # Broker connection resilience
    broker_connection_retry=True,
    broker_connection_retry_on_startup=True,
    broker_connection_max_retries=10,
    broker_transport_options={
        'max_retries': 10,
        'interval_start': 0,
        'interval_step': 0.2,
        'interval_max': 0.5,
        'visibility_timeout': 3600,  # 1 hour
        'master_name': 'mymaster',  # For Redis Sentinel (if used)
    },
    # Result backend (Redis) connection resilience
    result_backend_transport_options={
        'retry_policy': {
            'timeout': 5.0,
            'max_retries': 10,
        },
        'master_name': 'mymaster',  # For Redis Sentinel (if used)
    },
    # Task result settings
    result_expires=3600,  # Results expire after 1 hour
    result_backend_always_retry=True,
    result_backend_max_retries=10,
)

# 4. The "Dr. AI" Logic Task using Gemini API
@celery_app.task(name="predict_disease", bind=True, max_retries=3, default_retry_delay=10)
def predict_disease(self, symptoms: str, consultation_id: int = None):
    """
    Predict disease using Google Gemini API based on symptoms.
    Updates the database with the diagnosis result.
    
    Args:
        symptoms: String containing patient symptoms (serializable)
        consultation_id: Optional integer ID of the consultation record to update
    
    Returns:
        Dict containing diagnosis and recommendations (JSON serializable)
    """
    diagnosis_data = None
    task_status = "FAILURE"
    
    try:
        logger.info(f"Task started: predict_disease(consultation_id={consultation_id})")
        
        # Validate inputs
        if not symptoms or not isinstance(symptoms, str):
            error_msg = "Invalid symptoms input: must be a non-empty string"
            logger.error(f"{error_msg} (consultation_id={consultation_id})")
            diagnosis_data = {"status": "error", "error": error_msg}
            task_status = "FAILURE"
            if consultation_id and SessionLocal:
                try:
                    # For DB update we need a string - use JSON string for consistency
                    _update_consultation(consultation_id, json.dumps(diagnosis_data))
                except Exception as db_err:
                    logger.error(f"Failed to update database with error status: {db_err}")
            return diagnosis_data
        
        # Re-check and validate API key at task execution time (more reliable)
        # CRITICAL: Reload environment variables to ensure we have the latest value
        api_key = os.getenv("GEMINI_API_KEY")
        
        if not api_key:
            error_msg = "GEMINI_API_KEY not found in environment variables. Please ensure it is set in .env file or environment."
            logger.error(f"{error_msg} (consultation_id={consultation_id})")
            diagnosis_data = {"status": "error", "error": error_msg}
            task_status = "FAILURE"
            if consultation_id and SessionLocal:
                try:
                    _update_consultation(consultation_id, json.dumps(diagnosis_data))
                except Exception as db_err:
                    logger.error(f"Failed to update database with error status: {db_err}")
            return diagnosis_data
        
        # Validate API key format
        api_key = api_key.strip()
        if not api_key:
            error_msg = "GEMINI_API_KEY is empty or contains only whitespace."
            logger.error(f"{error_msg} (consultation_id={consultation_id})")
            diagnosis_data = {"status": "error", "error": error_msg}
            task_status = "FAILURE"
            if consultation_id and SessionLocal:
                try:
                    _update_consultation(consultation_id, json.dumps(diagnosis_data))
                except Exception as db_err:
                    logger.error(f"Failed to update database with error status: {db_err}")
            return diagnosis_data
        
        # Re-configure Gemini API with current API key
        try:
            genai.configure(api_key=api_key)
            logger.info(f"Gemini API configured for task execution (consultation_id={consultation_id})")
        except Exception as config_err:
            error_msg = f"Failed to configure Gemini API: {str(config_err)}"
            logger.error(f"{error_msg} (consultation_id={consultation_id})", exc_info=True)
            diagnosis_data = {"status": "error", "error": error_msg}
            task_status = "FAILURE"
            if consultation_id and SessionLocal:
                try:
                    _update_consultation(consultation_id, json.dumps(diagnosis_data))
                except Exception as db_err:
                    logger.error(f"Failed to update database with error status: {db_err}")
            return diagnosis_data
        
        # Get model name from environment variable
        env_model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash").strip()
        
        # Get model name from environment variable
        env_model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash").strip()
        
        # DYNAMIC MODEL DISCOVERY
        # Instead of hardcoding, we ask the API what is available
        models_to_try = []
        try:
            logger.info("Discovering available Gemini models...")
            available_models = []
            for m in genai.list_models():
                if 'generateContent' in m.supported_generation_methods:
                    available_models.append(m.name)
            
            logger.info(f"Available models found: {available_models}")
            
            # Prioritize models:
            # 1. Environment variable model (if exists)
            # 2. 1.5-Flash variants
            # 3. 1.5-Pro variants
            # 4. 1.0 / Pro variants
            # 5. Anything else
            
            # Helper to check partial match
            def get_matches(substring):
                return [m for m in available_models if substring in m]

            # Build prioritized list
            if any(env_model_name in m for m in available_models):
                models_to_try.append(env_model_name)
                
            models_to_try.extend(get_matches("gemini-1.5-flash"))
            models_to_try.extend(get_matches("gemini-1.5-pro"))
            models_to_try.extend(get_matches("gemini-1.0"))
            models_to_try.extend(get_matches("gemini-pro"))
            
            # Add everything else that wasn't added yet
            for m in available_models:
                if m not in models_to_try:
                    models_to_try.append(m)
            
            # If discovery failed or returned nothing, fallback to hardcoded defaults
            if not models_to_try:
                logger.warning("No models discovered via API, falling back to hardcoded list")
                models_to_try = [env_model_name, "gemini-1.5-flash", "gemini-pro"]
                
        except Exception as e:
            logger.error(f"Failed to list models dynamically: {e}")
            models_to_try = [env_model_name, "gemini-1.5-flash", "gemini-pro"]

        # Clean list (remove duplicates, ensure plain names)
        # some m.name might include 'models/' prefix, ensure consistency
        final_models = []
        for m in models_to_try:
            # strip 'models/' prefix if we are going to re-add it or just use as is
            # GenerativeModel accepts both "models/foo" and "foo" usually, but best to use as returned
            if m not in final_models:
                final_models.append(m)
        
        models_to_try = final_models
        logger.info(f"Final model trial order: {models_to_try}")
        
        # Create a detailed prompt for medical diagnosis requesting JSON (PRE-CALCULATED)
        prompt = f"""You are a medical AI assistant. Analyze the following symptoms and provide a diagnosis in structured JSON format.

Symptoms: {symptoms}

Output MUST be a valid JSON object with the following structure:
{{
  "diagnosis": "Name of the most likely condition",
  "diagnosis_summary": "A brief 1-2 sentence summary of the diagnosis",
  "detailed_diagnosis": "A comprehensive explanation of the condition",
  "conditions": [
    {{
      "name": "Condition Name",
      "confidence": 85,
      "severity": "high" | "medium" | "low",
      "reasoning": "Why this matches"
    }}
  ],
  "recommended_tests": ["List of recommended medical tests"],
  "consult_doctor": "Type of specialist to consult (e.g. Cardiologist)",
  "precautions": ["List of immediate precautions"],
  "prevention": ["List of prevention tips"],
  "lifestyle_tips": ["List of lifestyle changes"],
  "tips": ["General health tips"]
}}

Ensure the response is purely valid JSON without markdown formatting."""

        last_error = None
        success = False

        for model_name in models_to_try:
            try:
                logger.info(f"Attempting with model: {model_name} (consultation_id={consultation_id})")
                model = genai.GenerativeModel(model_name)
                
                logger.info(f"Calling Gemini API ({model_name})... (consultation_id={consultation_id})")
                start_time = time.time()
                
                response = model.generate_content(
                    prompt,
                    generation_config={
                        'temperature': 0.4,
                        'top_p': 0.8,
                        'top_k': 40,
                        'max_output_tokens': 4096,
                        'response_mime_type': 'application/json'
                    }
                )
                
                elapsed_time = time.time() - start_time
                logger.info(f"Gemini API call ({model_name}) completed in {elapsed_time:.2f}s")
                
                # Extract and parse JSON
                raw_text = response.text.strip()
                if raw_text.startswith("```json"):
                    raw_text = raw_text[7:]
                if raw_text.endswith("```"):
                    raw_text = raw_text[:-3]
                
                diagnosis_data = json.loads(raw_text)
                diagnosis_data['status'] = 'success'
                diagnostic_model_used = model_name # Track which model worked
                
                logger.info(f"✓ Valid JSON diagnosis received from {model_name}")
                task_status = "SUCCESS"
                success = True
                break # SUCCESS! Exit loop
                
            except Exception as e:
                last_error = e
                # Specifically catch 404/NotFound or other API errors and continue
                logger.warning(f"Model {model_name} failed: {str(e)}. Trying next...")
                continue
        
        if not success:
             # All models failed
            logger.error(f"All models failed. Last error: {last_error}", exc_info=True)
            diagnosis_data = {"status": "error", "error": f"AI Service Error: All models failed. Last error: {str(last_error)}"}
            task_status = "FAILURE"
            
            # Retry entire task if appropriate (but maybe not if we exhausted all models?)
            if self.request.retries < self.max_retries:
                retry_delay = min(10 * (self.request.retries + 1), 60)
                raise self.retry(exc=last_error, countdown=retry_delay)
                
        # Update database if consultation_id is provided
        if consultation_id and SessionLocal:
            try:
                # Store the JSON string in the database
                json_str = json.dumps(diagnosis_data)
                _update_consultation(consultation_id, json_str)
                logger.info(f"✓ Database updated for consultation_id={consultation_id}")
            except Exception as db_error:
                logger.warning(f"Failed to update database (consultation_id={consultation_id}): {db_error}")

        return diagnosis_data
        
        # Update database if consultation_id is provided
        if consultation_id and SessionLocal:
            try:
                # Store the JSON string in the database
                json_str = json.dumps(diagnosis_data)
                _update_consultation(consultation_id, json_str)
                logger.info(f"✓ Database updated for consultation_id={consultation_id}")
            except Exception as db_error:
                logger.warning(f"Failed to update database (consultation_id={consultation_id}): {db_error}")

        return diagnosis_data

    except Exception as e:
        logger.error(f"Unexpected error in predict_disease task: {str(e)}", exc_info=True)
        return {"status": "error", "error": f"Internal Worker Error: {str(e)}"}

def _update_consultation(consultation_id: int, diagnosis: str):
    """Helper function to update consultation diagnosis in database"""
    if not SessionLocal:
        logger.warning(f"SessionLocal not available, skipping database update (consultation_id={consultation_id})")
        return
    
    db = SessionLocal()
    try:
        consultation = db.query(Consultation).filter(Consultation.id == consultation_id).first()
        if consultation:
            consultation.diagnosis = diagnosis
            db.commit()
            logger.info(f"✓ Updated consultation {consultation_id} with diagnosis")
        else:
            logger.warning(f"Consultation {consultation_id} not found in database")
    except Exception as e:
        db.rollback()
        logger.error(f"ERROR updating consultation {consultation_id}: {e}", exc_info=True)
        raise
    finally:
        db.close()