from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from ..db import get_db
from .. import schemas
from ..services import orders_service

router = APIRouter()


@router.post("/", response_model=schemas.OrderRead)
def create_order(payload: schemas.OrderCreate, db: Session = Depends(get_db)):
    # TODO: optionally validate that company and customer exist
    order = orders_service.create_order(db, payload)
    return order


@router.get("/company/{company_id}", response_model=schemas.OrdersList)
def list_orders(company_id: int, limit: int = 50, offset: int = 0, db: Session = Depends(get_db)):
    return orders_service.list_orders_by_company(db, company_id, limit=limit, offset=offset)


@router.get("/", response_model=schemas.OrdersList)
def list_orders_all(company_id: Optional[int] = None, limit: int = 50, offset: int = 0, db: Session = Depends(get_db)):
    if company_id is not None:
        return orders_service.list_orders_by_company(db, company_id, limit=limit, offset=offset)
    return orders_service.list_orders_all(db, limit=limit, offset=offset)
