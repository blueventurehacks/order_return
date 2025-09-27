from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="RETURNS_", extra="ignore")

    # Core settings
    environment: str = "development"
    database_url: str = "sqlite:///./returns.db"

    # Optional integrations
    email_from: Optional[str] = None
    sendgrid_api_key: Optional[str] = None
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None


settings = Settings()


class HealthResponse(BaseModel):
    name: str
    environment: str
    status: str
