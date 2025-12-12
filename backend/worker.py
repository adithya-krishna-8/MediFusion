import os
import sys
import time
import json
import logging
import google.generativeai as genai
from celery import Celery
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Consultation, Base, Medicine, User
from dotenv import load_dotenv
import asyncio
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType

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

# Email Configuration
conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME", "your_email@gmail.com"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD", "your_app_password"),
    MAIL_FROM=os.getenv("MAIL_FROM", os.getenv("MAIL_USERNAME", "your_email@gmail.com")),
    MAIL_PORT=587,
    MAIL_SERVER="smtp.gmail.com",
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)

@celery_app.task(name="send_welcome_email")
def send_welcome_email_task(email_address: str, full_name: str):
    """
    Sends a welcome email using fastapi-mail.
    This is run asynchronously by the Celery worker.
    """
    logger.info(f"Preparing welcome email for {email_address}")
    
    html = f"""
    <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
            <div style="background-color: #f8fafc; padding: 20px; text-align: center;">
                <h1 style="color: #0ea5e9;">Welcome to MediFusion!</h1>
            </div>
            <div style="padding: 20px; max-width: 600px; margin: 0 auto;">
                <p>Hello <strong>{full_name}</strong>,</p>
                <p><strong>Thank you for trying MediFusion!</strong> We are thrilled to have you join our journey towards smarter healthcare.</p>
                <p>With your new account, you can:</p>
                <ul>
                    <li>Use our AI-powered symptom checker.</li>
                    <li>Track your diagnosis history.</li>
                    <li>Learn about heart health and medicines.</li>
                </ul>
                <p>If you have any questions, feel free to reply to this email.</p>
                <br>
                <p>Best regards,</p>
                <p>The MediFusion Team</p>
            </div>
        </body>
    </html>
    """.format(full_name=full_name)
    
    # Simple Text fallback
    message = MessageSchema(
        subject="Welcome to MediFusion",
        recipients=[email_address],
        body=html,
        subtype=MessageType.html
    )
    
    fm = FastMail(conf)
    
    # Run async send_message in sync Celery task
    try:
        logger.info(f"Connecting to SMTP server {conf.MAIL_SERVER}:{conf.MAIL_PORT}...")
        asyncio.run(fm.send_message(message))
        logger.info(f"✓ EMAIL SENT SUCCESSFULLY to {email_address}")
    except Exception as e:
        logger.error(f"❌ FASTAPI-MAIL ERROR: {e}")
        logger.error(f"Check configuration: USER={conf.MAIL_USERNAME}, HOST={conf.MAIL_SERVER}")

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
        
        # DYNAMIC MODEL DISCOVERY DISABLED to prevent Rate Limit (429) errors on Free Tier.
        # requesting list_models() counts as a request, and iterating fast hits RPM limits.
        
        # We strictly prefer 1.5-flash for speed and higher RPM (15 RPM vs 2 RPM for Pro)
        models_to_try = ["gemini-1.5-flash"]
        
        # If the environment variable is set to something else, add it as a backup or primary?
        # Ideally, just stick to Flash for stability unless user forces otherwise.
        if env_model_name and env_model_name != "gemini-1.5-flash":
             # If user specifically asked for another model in .env, try that first?
             # No, if they are hitting quotas, Flash is the safest bet. 
             # Let's just log what we are doing.
             logger.info(f"Overriding configured model '{env_model_name}' with 'gemini-1.5-flash' for stability.")
        
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

# Celery Beat Schedule
celery_app.conf.beat_schedule = {
    'check-medicine-reminders-every-minute': {
        'task': 'check_medicine_reminders',
        'schedule': 60.0, # Run every 60 seconds
    },
}

@celery_app.task(name="check_medicine_reminders")
def check_medicine_reminders():
    """
    Periodic task to check if any medicines need to be taken now (UTC time).
    """
    from datetime import datetime
    import pytz
    
    # We'll use UTC for simplicity on the server, but assuming user input is consistent?
    # Ideally, we should store user timezone or handle offsets.
    # For MVP: Assuming user inputs time in UTC or we just check server time matching.
    # Let's just use server system time (which is likely UTC in Docker).
    
    now = datetime.now() 
    current_time_str = now.strftime("%H:%M") # "09:00"
    
    logger.info(f"Checking medicine reminders for time: {current_time_str}")
    
    if not SessionLocal:
        logger.error("Database session not initialized")
        return

    db = SessionLocal()
    try:
        # Find active medicines for this time
        # Join with User to get email
        medicines_due = db.query(Medicine).join(User).filter(
            Medicine.reminder_time == current_time_str,
            Medicine.is_active == 1
        ).all()
        
        if not medicines_due:
            logger.info("No medicines due at this time.")
            return

        logger.info(f"Found {len(medicines_due)} medicines due.")
        
        for med in medicines_due:
            user_email = med.owner.email
            user_name = med.owner.full_name or "User"
            med_name = med.name
            dosage = med.dosage
            
            # Send Email (Sync or fire async task? We are already in a worker)
            # We can use the same logic as welcome email logic or call it
            logger.info(f"Sending reminder for {med_name} to {user_email}")
            
            # Construct Email
            html = f"""
            <html>
                <body style="font-family: Arial, sans-serif;">
                    <div style="padding: 20px; background-color: #fef2f2; border: 1px solid #ef4444; border-radius: 8px;">
                        <h2 style="color: #b91c1c; margin-top: 0;">Medicine Reminder 💊</h2>
                        <p>Hi {user_name},</p>
                        <p>It is <strong>{current_time_str}</strong>. Time to take your medicine:</p>
                        <h3 style="background-color: white; padding: 10px; display: inline-block; border-radius: 4px;">
                            {med_name} ({dosage})
                        </h3>
                        <p>Stay healthy!</p>
                        <p>MediFusion AI</p>
                    </div>
                </body>
            </html>
            """
            
            message = MessageSchema(
                subject=f"Reminder: Time to take {med_name}",
                recipients=[user_email],
                body=html,
                subtype=MessageType.html
            )
            
            fm = FastMail(conf)
            try:
                asyncio.run(fm.send_message(message))
            except Exception as e:
                logger.error(f"Failed to send reminder to {user_email}: {e}")
                
    except Exception as e:
        logger.error(f"Error checking reminders: {e}")
    finally:
        db.close()