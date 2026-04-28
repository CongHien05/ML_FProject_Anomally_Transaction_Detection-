from pydantic import BaseModel, Field


class TransactionRequest(BaseModel):
    step: int = Field(..., description="Unit of time in the simulation (1 step = 1 hour).")
    type: str = Field(..., description="Transaction type.")
    amount: float = Field(..., description="Transaction amount in local currency.")
    oldbalanceOrg: float = Field(..., description="Balance of the origin account BEFORE the transaction.")
    newbalanceOrig: float = Field(..., description="Balance of the origin account AFTER the transaction.")
    oldbalanceDest: float = Field(..., description="Balance of the destination account BEFORE the transaction.")
    newbalanceDest: float = Field(..., description="Balance of the destination account AFTER the transaction.")


class PredictionResponse(BaseModel):
    risk_score: float
    risk_level: str
    explanations: list[str]
    log_id: int | None = None


class LogReviewRequest(BaseModel):
    review_status: str
    review_note: str | None = None
