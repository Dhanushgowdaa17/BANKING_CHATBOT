import os
from datetime import timedelta

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "smartbank-secret-2024")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "smartbank-jwt-2024")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    DATABASE_PATH = os.environ.get("DATABASE_PATH", "smartbank.db")
    RASA_URL = os.environ.get("RASA_URL", "http://localhost:5005")
    DEBUG = os.environ.get("DEBUG", "True") == "True"
