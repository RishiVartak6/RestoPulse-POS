import os
import sys
from pydantic_settings import BaseSettings
from functools import lru_cache

# Resolve base directory consistently
if hasattr(sys, '_MEIPASS'):
    BASE_DIR = os.path.dirname(sys.executable)
else:
    cwd = os.getcwd()
    if os.path.basename(cwd) == "backend":
        BASE_DIR = os.path.dirname(cwd)
    else:
        BASE_DIR = cwd

db_path = os.path.join(BASE_DIR, "restaurant_pos.db").replace("\\", "/")

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = f"sqlite:///{db_path}"

    # JWT
    SECRET_KEY: str = "your-super-secret-key-change-this-in-production-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # App
    APP_NAME: str = "My Restaurant"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    DEBUG: bool = True

    # Admin Seeder
    ADMIN_EMAIL: str = "admin@restaurant.com"
    ADMIN_PASSWORD: str = "admin123"

    # Customer App URL
    CUSTOMER_APP_URL: str = "http://localhost:5174"

    # File Upload
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 5

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
