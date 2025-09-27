from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from .. import schemas
from ..services import shipping_service

router = APIRouter()


@router.post("/", response_model=schemas.ShipmentRead)
def create_shipment(payload: schemas.ShipmentCreate, db: Session = Depends(get_db)):
    return shipping_service.create_shipment(db, payload.return_request_id, payload.carrier)


@router.get("/{shipment_id}", response_model=schemas.ShipmentRead)
def get_shipment(shipment_id: int, db: Session = Depends(get_db)):
    sh = shipping_service.get_shipment(db, shipment_id)
    if not sh:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return sh
