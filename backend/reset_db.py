from database import engine
from models import Base

# Drop all existing tables
print("Dropping all existing tables...")
Base.metadata.drop_all(bind=engine)

# Create all tables with the new schema
print("Creating tables with updated schema...")
Base.metadata.create_all(bind=engine)

print("Database reset complete!")
