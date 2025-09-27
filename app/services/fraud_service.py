from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional

from .. import models


def flag_for_review(db: Session, return_request_id: int, risk_score: int = 0, notes: str | None = None) -> models.FraudReview:
    fr = models.FraudReview(return_request_id=return_request_id, risk_score=risk_score, notes=notes, reviewed=False)
    db.add(fr)
    db.commit()
    db.refresh(fr)
    return fr


def mark_reviewed(db: Session, review_id: int) -> models.FraudReview | None:
    fr = db.query(models.FraudReview).filter(models.FraudReview.id == review_id).first()
    if not fr:
        return None
    fr.reviewed = True
    db.commit()
    db.refresh(fr)
    return fr


def get_fraud_reviews(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    reviewed: Optional[bool] = None
) -> List[models.FraudReview]:
    """
    Retrieve fraud reviews with optional filtering and pagination.
    
    Args:
        db: Database session
        skip: Number of records to skip
        limit: Maximum number of records to return
        reviewed: Filter by reviewed status if provided
        
    Returns:
        List of fraud reviews
    """
    query = db.query(models.FraudReview)
    
    # Apply filters if provided
    if reviewed is not None:
        query = query.filter(models.FraudReview.reviewed == reviewed)
    
    # Order by ID (newest first) and apply pagination
    return query.order_by(desc(models.FraudReview.id))\
               .offset(skip)\
               .limit(limit)\
               .all()
