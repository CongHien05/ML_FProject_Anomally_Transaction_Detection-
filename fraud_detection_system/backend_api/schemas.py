"""
Pydantic models for request/response validation.
"""

from pydantic import BaseModel, Field
from typing import Literal


class TransactionInput(BaseModel):
    """Input schema for transaction data."""
    
    transaction_amount: float = Field(
        ..., 
        gt=0, 
        description="Transaction amount in dollars",
        example=150.50
    )
    transaction_hour: int = Field(
        ..., 
        ge=0, 
        le=23, 
        description="Hour of transaction (0-23)",
        example=14
    )
    merchant_risk_score: float = Field(
        ..., 
        ge=0, 
        le=1, 
        description="Merchant risk score (0-1)",
        example=0.3
    )
    customer_age_days: int = Field(
        ..., 
        gt=0, 
        description="Customer account age in days",
        example=365
    )
    transaction_count_24h: int = Field(
        ..., 
        ge=0, 
        description="Number of transactions in last 24 hours",
        example=2
    )
    avg_transaction_amount_7d: float = Field(
        ..., 
        ge=0, 
        description="Average transaction amount last 7 days",
        example=120.0
    )
    is_international: Literal[0, 1] = Field(
        ..., 
        description="1 if international transaction, 0 otherwise",
        example=0
    )


class PredictionOutput(BaseModel):
    """Output schema for fraud prediction."""
    
    is_fraud: bool = Field(
        ..., 
        description="True if transaction is predicted as fraud"
    )
    fraud_probability: float = Field(
        ..., 
        ge=0, 
        le=1, 
        description="Probability of fraud (0-1)"
    )
    risk_level: str = Field(
        ..., 
        description="Risk level: low, medium, high"
    )
    message: str = Field(
        ..., 
        description="Human-readable prediction message"
    )
