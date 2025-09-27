from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select, func
from typing import Dict, Any

from .. import models, schemas


def create_order(db: Session, payload: schemas.OrderCreate) -> models.Order:
    order = models.Order(
        company_id=payload.company_id,
        customer_id=payload.customer_id,
        order_number=payload.order_number,
        total_amount=payload.total_amount,
        currency=payload.currency,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def list_orders_by_company(db: Session, company_id: int, limit: int = 50, offset: int = 0) -> Dict[str, Any]:
    # Get total count
    total = db.scalar(
        select(func.count())
        .select_from(models.Order)
        .where(models.Order.company_id == company_id)
    )
    
    # Get paginated orders with return_requests
    stmt = (
        select(models.Order)
        .options(selectinload(models.Order.return_requests))
        .where(models.Order.company_id == company_id)
        .order_by(models.Order.id.desc())
        .limit(limit)
        .offset(offset)
    )
    
    orders = db.scalars(stmt).all()
    items = [_order_to_dict(order) for order in orders]
    
    return {
        'items': items,
        'total': total,
        'limit': limit,
        'offset': offset
    }


def list_orders_all(db: Session, limit: int = 50, offset: int = 0) -> Dict[str, Any]:
    # Get total count
    total = db.scalar(select(func.count()).select_from(models.Order))
    
    # Get paginated orders with return_requests
    stmt = (
        select(models.Order)
        .options(selectinload(models.Order.return_requests))
        .order_by(models.Order.id.desc())
        .limit(limit)
        .offset(offset)
    )
    
    orders = db.scalars(stmt).all()
    items = [_order_to_dict(order) for order in orders]
    
    return {
        'items': items,
        'total': total,
        'limit': limit,
        'offset': offset
    }


def _order_to_dict(order: models.Order) -> Dict[str, Any]:
    """Convert Order model to dictionary."""
    return {
        'id': order.id,
        'company_id': order.company_id,
        'customer_id': order.customer_id,
        'order_number': order.order_number,
        'total_amount': float(order.total_amount) if order.total_amount else None,
        'currency': order.currency,
        'return_status': order.return_requests[0].status if order.return_requests else None
    }
