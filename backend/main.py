from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import models
from database import engine
from routers import auth, disease, medicines  # Ensure these exist
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# app definition
app = FastAPI(title="Medifusion API", version="1.0.0")

# CORS (Allow everything for local dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers - NO PREFIX for Auth
app.include_router(auth.router, prefix="/api", tags=["Authentication"])
app.include_router(disease.router, prefix="/api/disease", tags=["Disease"])
app.include_router(medicines.router, prefix="/api", tags=["Medicines"])

@app.on_event("startup")
async def startup_event():
    """Create database tables on application startup."""
    try:
        logger.info("Creating database tables...")
        models.Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully.")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
        raise

@app.get("/")
def read_root():
    return {"message": "MediFusion Backend is Running"}

@app.get("/health")
def health_check():
    return {"status": "ok"}