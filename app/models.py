from datetime import datetime
from typing import Optional

from sqlalchemy import String, Integer, DateTime, ForeignKey, Enum, Numeric, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    customers: Mapped[list["Customer"]] = relationship(back_populates="company")


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), index=True)
    email: Mapped[str] = mapped_column(String(255), index=True)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    company: Mapped[Company] = relationship(back_populates="customers")
    orders: Mapped[list["Order"]] = relationship(back_populates="customer")


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), index=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), index=True)
    order_number: Mapped[str] = mapped_column(String(64), index=True)
    total_amount: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), default="USD")

    customer: Mapped[Customer] = relationship(back_populates="orders")
    return_requests: Mapped[list["ReturnRequest"]] = relationship(back_populates="order")
    statuses: Mapped[list["OrderStatusHistory"]] = relationship(
        back_populates="order", cascade="all, delete-orphan"
    )


class OrderStatusHistory(Base):
    __tablename__ = "order_status_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    changed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    changed_by: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    order: Mapped[Order] = relationship(back_populates="statuses")


class ReturnStatusEnum(str):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    DENIED = "DENIED"
    RECEIVED = "RECEIVED"
    REFUNDED = "REFUNDED"


class ReturnRequest(Base):
    __tablename__ = "return_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), index=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), index=True)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default=ReturnStatusEnum.PENDING)
    rma_code: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    order: Mapped[Order] = relationship(back_populates="return_requests")
    items: Mapped[list["ReturnItem"]] = relationship(back_populates="return_request", cascade="all, delete-orphan")
    shipment: Mapped[Optional["Shipment"]] = relationship(back_populates="return_request", uselist=False)
    refund: Mapped[Optional["Refund"]] = relationship(back_populates="return_request", uselist=False)
    fraud_review: Mapped[Optional["FraudReview"]] = relationship(back_populates="return_request", uselist=False)

    @property
    def order_number(self) -> Optional[str]:
        """Expose related order's number for serialization convenience."""
        try:
            return self.order.order_number if self.order else None
        except Exception:
            return None


class ReturnItem(Base):
    __tablename__ = "return_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    return_request_id: Mapped[int] = mapped_column(ForeignKey("return_requests.id"), index=True)
    sku: Mapped[str] = mapped_column(String(64))
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    condition_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    return_request: Mapped[ReturnRequest] = relationship(back_populates="items")


class Shipment(Base):
    __tablename__ = "shipments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    return_request_id: Mapped[int] = mapped_column(ForeignKey("return_requests.id"), index=True)
    carrier: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    tracking_number: Mapped[Optional[str]] = mapped_column(String(64), index=True)
    label_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    return_request: Mapped[ReturnRequest] = relationship(back_populates="shipment")


class Refund(Base):
    __tablename__ = "refunds"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    return_request_id: Mapped[int] = mapped_column(ForeignKey("return_requests.id"), index=True)
    amount: Mapped[float] = mapped_column(Numeric(10, 2))
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    processed: Mapped[bool] = mapped_column(Boolean, default=False)
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    return_request: Mapped[ReturnRequest] = relationship(back_populates="refund")


class FraudReview(Base):
    __tablename__ = "fraud_reviews"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    return_request_id: Mapped[int] = mapped_column(ForeignKey("return_requests.id"), index=True)
    risk_score: Mapped[int] = mapped_column(Integer, default=0)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reviewed: Mapped[bool] = mapped_column(Boolean, default=False)

    return_request: Mapped[ReturnRequest] = relationship(back_populates="fraud_review")
