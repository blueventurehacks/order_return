from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from ..db import get_db
from .. import schemas
from ..services import fraud_service

router = APIRouter()


@router.post("/", response_model=schemas.FraudReviewRead)
def flag(payload: schemas.FraudReviewCreate, db: Session = Depends(get_db)):
    return fraud_service.flag_for_review(db, payload.return_request_id, payload.risk_score, payload.notes)


@router.post("/{review_id}/mark-reviewed", response_model=schemas.FraudReviewRead)
def mark_reviewed(review_id: int, db: Session = Depends(get_db)):
    fr = fraud_service.mark_reviewed(db, review_id)
    if not fr:
        raise HTTPException(status_code=404, detail="Review not found")
    return fr


@router.get("/", response_model=List[schemas.FraudReviewRead])
def list_fraud_reviews(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, le=1000, description="Maximum number of records to return"),
    reviewed: Optional[bool] = Query(None, description="Filter by reviewed status"),
    db: Session = Depends(get_db)
):
    """
    Get a list of all fraud reviews with optional filtering.
    """
    try:
        return fraud_service.get_fraud_reviews(
            db,
            skip=skip,
            limit=limit,
            reviewed=reviewed
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
