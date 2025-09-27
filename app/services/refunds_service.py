from datetime import datetime
from sqlalchemy.orm import Session

from .. import models


def process_refund(db: Session, return_request_id: int, amount: float, currency: str = "USD") -> models.Refund:
    refund = models.Refund(return_request_id=return_request_id, amount=amount, currency=currency, processed=True, processed_at=datetime.utcnow())
    db.add(refund)
    db.commit()
    db.refresh(refund)
    return refund
