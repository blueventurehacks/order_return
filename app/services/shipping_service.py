from sqlalchemy.orm import Session
from typing import Optional

from .. import models


def create_shipment(db: Session, return_request_id: int, carrier: Optional[str] = None) -> models.Shipment:
    shipment = models.Shipment(return_request_id=return_request_id, carrier=carrier, tracking_number=None, label_url=None)
    db.add(shipment)
    db.commit()
    db.refresh(shipment)
    return shipment


def get_shipment(db: Session, shipment_id: int) -> models.Shipment | None:
    return db.query(models.Shipment).filter(models.Shipment.id == shipment_id).first()
