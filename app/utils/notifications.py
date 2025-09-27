from typing import Optional

from .logger import get_logger
from ..config import settings

logger = get_logger(__name__)


def send_email(to_email: str, subject: str, body: str) -> None:
    if not settings.sendgrid_api_key or not settings.email_from:
        logger.info(f"Email skipped (no credentials): to={to_email} subject={subject}")
        return
    # Integrate with SendGrid or other provider here
    logger.info(f"Email sent (simulated): from={settings.email_from} to={to_email} subject={subject}")


def send_sms(to_number: str, message: str) -> None:
    if not settings.twilio_account_sid or not settings.twilio_auth_token:
        logger.info(f"SMS skipped (no credentials): to={to_number}")
        return
    # Integrate with Twilio here
    logger.info(f"SMS sent (simulated): to={to_number} message={message}")
