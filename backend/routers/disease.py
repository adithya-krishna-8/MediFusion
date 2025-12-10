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

from database import get_db
from models import User, Consultation
from routers.auth import get_current_user
import os

class SymptomInput(BaseModel):
    text: str

@router.post("/predict")
async def predict_disease_endpoint(
    data: SymptomInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit symptoms for AI diagnosis analysis (Synchronous for simplified deployment).
    """
    try:
        logger.info(f"Received diagnosis request from user_id={current_user.id}")
        
        # 1. Create Consultation (Pending)
        new_consultation = Consultation(
            user_id=current_user.id,
            symptoms=data.text,
            diagnosis='Processing...'
        )
        db.add(new_consultation)
        db.commit()
        db.refresh(new_consultation)
        
        # 2. Logic from worker.py (Adapted for synchronous execution)
        import google.generativeai as genai
        import os
        
        # Configure API
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="GEMINI_API_KEY not set")
        
        genai.configure(api_key=api_key)
        
        # Smart Model Discovery
        env_model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash").strip()
        models_to_try = []
        try:
            available_models = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
            
            def get_matches(substring):
                return [m for m in available_models if substring in m]

            if any(env_model_name in m for m in available_models):
                models_to_try.append(env_model_name)
            
            models_to_try.extend(get_matches("gemini-1.5-flash"))
            models_to_try.extend(get_matches("gemini-1.5-pro"))
            models_to_try.extend(get_matches("gemini-1.0"))
            models_to_try.extend(get_matches("gemini-pro"))
            
            for m in available_models:
                if m not in models_to_try:
                    models_to_try.append(m)
                    
            if not models_to_try:
                models_to_try = [env_model_name, "gemini-1.5-flash", "gemini-pro"]
                
        except Exception:
            models_to_try = [env_model_name, "gemini-1.5-flash", "gemini-pro"]
            
        final_models = []
        for m in models_to_try:
            if m not in final_models:
                final_models.append(m)
        models_to_try = final_models
        
        # Prompt
        prompt = f"""You are a medical AI assistant. Analyze the following symptoms and provide a diagnosis in structured JSON format.

Symptoms: {data.text}

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

        # Execute
        diagnosis_data = None
        success = False
        last_error = None
        
        for model_name in models_to_try:
            try:
                model = genai.GenerativeModel(model_name)
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
                
                raw_text = response.text.strip()
                if raw_text.startswith("```json"): raw_text = raw_text[7:]
                if raw_text.endswith("```"): raw_text = raw_text[:-3]
                
                diagnosis_data = json.loads(raw_text)
                diagnosis_data['status'] = 'success'
                success = True
                break
            except Exception as e:
                last_error = e
                continue
                
        if not success:
            raise HTTPException(status_code=500, detail=f"AI Error: {str(last_error)}")
            
        # Update DB
        new_consultation.diagnosis = json.dumps(diagnosis_data)
        db.commit()
        
        # Return directly (No task_id needed anymore)
        return {
            "status": "SUCCESS",
            "result": diagnosis_data,
            "consultation_id": new_consultation.id
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in predict endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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