from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings, HealthResponse
from .db import Base, engine
from .utils.logger import get_logger
from .api.returns_api import router as returns_router
from .api.shipping_api import router as shipping_router
from .api.refunds_api import router as refunds_router
from .api.fraud_api import router as fraud_router
from .api.orders_api import router as orders_router

logger = get_logger(__name__)

# Ensure tables are created for demo/dev. In production use Alembic migrations.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Return Pipeline API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(name="return-pipeline", environment=settings.environment, status="ok")


# Routers
app.include_router(returns_router, prefix="/returns", tags=["returns"])
app.include_router(shipping_router, prefix="/shipping", tags=["shipping"])
app.include_router(refunds_router, prefix="/refunds", tags=["refunds"])
app.include_router(fraud_router, prefix="/fraud", tags=["fraud"])
app.include_router(orders_router, prefix="/orders", tags=["orders"])
