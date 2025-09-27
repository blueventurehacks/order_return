from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from .. import schemas
from ..services import returns_service

router = APIRouter()


@router.post("/", response_model=schemas.ReturnRequestRead)
def create_return(payload: schemas.ReturnRequestCreate, db: Session = Depends(get_db)):
    rr = returns_service.create_return(db, payload.company_id, payload.order_id, [i.model_dump() for i in payload.items], payload.reason)
    return rr


@router.get("/{return_id}", response_model=schemas.ReturnRequestRead)
def get_return(return_id: int, db: Session = Depends(get_db)):
    rr = returns_service.get_return(db, return_id)
    if not rr:
        raise HTTPException(status_code=404, detail="Return not found")
    return rr


@router.get("/company/{company_id}", response_model=list[schemas.ReturnRequestRead])
def list_returns(company_id: int, limit: int = 50, offset: int = 0, db: Session = Depends(get_db)):
    return returns_service.list_returns(db, company_id, limit=limit, offset=offset)


@router.patch("/{return_id}/approve", response_model=schemas.ReturnRequestRead)
def approve_return(return_id: int, db: Session = Depends(get_db)):
    rr = returns_service.approve_return(db, return_id)
    if not rr:
        raise HTTPException(status_code=404, detail="Return not found")
    return rr


@router.patch("/{return_id}/deny", response_model=schemas.ReturnRequestRead)
def deny_return(return_id: int, db: Session = Depends(get_db)):
    rr = returns_service.deny_return(db, return_id)
    if not rr:
        raise HTTPException(status_code=404, detail="Return not found")
    return rr


@router.patch("/{return_id}/received", response_model=schemas.ReturnRequestRead)
def mark_received(return_id: int, db: Session = Depends(get_db)):
    rr = returns_service.mark_received(db, return_id)
    if not rr:
        raise HTTPException(status_code=404, detail="Return not found")
    return rr


@router.patch("/{return_id}/refunded", response_model=schemas.ReturnRequestRead)
def mark_refunded(return_id: int, db: Session = Depends(get_db)):
    rr = returns_service.mark_refunded(db, return_id)
    if not rr:
        raise HTTPException(status_code=404, detail="Return not found")
    return rr
