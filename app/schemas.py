from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, EmailStr


# Company / Customer
class CompanyCreate(BaseModel):
    name: str


class CompanyRead(CompanyCreate):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class CustomerCreate(BaseModel):
    company_id: int
    email: EmailStr
    name: Optional[str] = None


class CustomerRead(CustomerCreate):
    id: int

    model_config = {"from_attributes": True}


# Orders
class OrderCreate(BaseModel):
    company_id: int
    customer_id: int
    order_number: str
    total_amount: Optional[float] = None
    currency: str = "USD"


class OrderRead(OrderCreate):
    id: int
    return_status: Optional[str] = None

    model_config = {"from_attributes": True}


class OrdersList(BaseModel):
    items: List[OrderRead]
    total: int
    limit: int
    offset: int


# Returns
class ReturnItemCreate(BaseModel):
    sku: str
    quantity: int = Field(ge=1)
    condition_note: Optional[str] = None


class ReturnItemRead(ReturnItemCreate):
    id: int

    model_config = {"from_attributes": True}


class ReturnRequestCreate(BaseModel):
    company_id: int
    order_id: int
    reason: Optional[str] = None
    items: List[ReturnItemCreate]


class ReturnRequestRead(BaseModel):
    id: int
    order_id: int
    company_id: int
    reason: Optional[str] = None
    status: str
    rma_code: str
    created_at: datetime
    updated_at: datetime
    order_number: Optional[str] = None
    items: List[ReturnItemRead] = []

    model_config = {"from_attributes": True}


# Shipment
class ShipmentCreate(BaseModel):
    return_request_id: int
    carrier: Optional[str] = None


class ShipmentRead(ShipmentCreate):
    id: int
    tracking_number: Optional[str] = None
    label_url: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# Refund
class RefundCreate(BaseModel):
    return_request_id: int
    amount: float
    currency: str = "USD"


class RefundRead(RefundCreate):
    id: int
    processed: bool
    processed_at: Optional[datetime]

    model_config = {"from_attributes": True}


# Fraud
class FraudReviewCreate(BaseModel):
    return_request_id: int
    risk_score: int = 0
    notes: Optional[str] = None


class FraudReviewRead(FraudReviewCreate):
    id: int
    reviewed: bool

    model_config = {"from_attributes": True}
