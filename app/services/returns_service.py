from sqlalchemy.orm import Session
from typing import List

from .. import models
from ..utils.barcode import generate_rma_code


def create_return(db: Session, company_id: int, order_id: int, items: List[dict], reason: str | None) -> models.ReturnRequest:
    rma = generate_rma_code()
    rr = models.ReturnRequest(company_id=company_id, order_id=order_id, reason=reason, rma_code=rma)
    for it in items:
        rr.items.append(models.ReturnItem(sku=it["sku"], quantity=it.get("quantity", 1), condition_note=it.get("condition_note")))
    db.add(rr)
    db.commit()
    db.refresh(rr)
    return rr


def get_return(db: Session, return_id: int) -> models.ReturnRequest | None:
    return db.query(models.ReturnRequest).filter(models.ReturnRequest.id == return_id).first()


def list_returns(db: Session, company_id: int, limit: int = 50, offset: int = 0) -> list[models.ReturnRequest]:
    return (
        db.query(models.ReturnRequest)
        .filter(models.ReturnRequest.company_id == company_id)
        .order_by(models.ReturnRequest.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


def _set_status(db: Session, return_id: int, status: str) -> models.ReturnRequest | None:
    rr = get_return(db, return_id)
    if not rr:
        return None
    rr.status = status
    db.commit()
    db.refresh(rr)
    return rr


def approve_return(db: Session, return_id: int) -> models.ReturnRequest | None:
    return _set_status(db, return_id, models.ReturnStatusEnum.APPROVED)


def deny_return(db: Session, return_id: int) -> models.ReturnRequest | None:
    return _set_status(db, return_id, models.ReturnStatusEnum.DENIED)


def mark_received(db: Session, return_id: int) -> models.ReturnRequest | None:
    return _set_status(db, return_id, models.ReturnStatusEnum.RECEIVED)


def mark_refunded(db: Session, return_id: int) -> models.ReturnRequest | None:
    return _set_status(db, return_id, models.ReturnStatusEnum.REFUNDED)
