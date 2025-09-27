from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from .. import schemas
from ..services import refunds_service

router = APIRouter()


@router.post("/", response_model=schemas.RefundRead)
def process_refund(payload: schemas.RefundCreate, db: Session = Depends(get_db)):
    return refunds_service.process_refund(db, payload.return_request_id, payload.amount, payload.currency)
