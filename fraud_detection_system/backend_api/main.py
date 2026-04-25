"""
FastAPI backend for fraud detection system.
Provides API endpoint for fraud prediction.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from schemas import TransactionInput, PredictionOutput
from ml_services import predict_fraud

app = FastAPI(
    title="Fraud Detection API",
    description="API for predicting fraudulent transactions",
    version="1.0.0"
)

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    """Health check endpoint."""
    return {"message": "Fraud Detection API is running"}


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.post("/predict", response_model=PredictionOutput)
def predict(transaction: TransactionInput):
    """
    Predict if a transaction is fraudulent.
    
    - **transaction_amount**: Amount of the transaction
    - **transaction_hour**: Hour of the day (0-23)
    - **merchant_risk_score**: Risk score of merchant (0-1)
    - **customer_age_days**: Account age in days
    - **transaction_count_24h**: Number of transactions in last 24h
    - **avg_transaction_amount_7d**: Average transaction amount last 7 days
    - **is_international**: 1 if international, 0 otherwise
    """
    try:
        result = predict_fraud(transaction)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
