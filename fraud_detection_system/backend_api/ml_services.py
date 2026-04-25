"""
Machine Learning service for making predictions.
Loads trained model and provides prediction function.
"""

import joblib
import numpy as np
import os
from schemas import TransactionInput, PredictionOutput

# Model paths
MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "machine_learning", "models", "fraud_model.pkl")
SCALER_PATH = os.path.join(os.path.dirname(__file__), "..", "machine_learning", "models", "scaler.pkl")

# Global variables for model and scaler
_model = None
_scaler = None


def load_model():
    """Load the trained model and scaler."""
    global _model, _scaler
    
    if _model is None:
        try:
            _model = joblib.load(MODEL_PATH)
            print(f"Model loaded from: {MODEL_PATH}")
        except FileNotFoundError:
            raise FileNotFoundError(f"Model file not found at: {MODEL_PATH}. Please train the model first.")
    
    if _scaler is None:
        try:
            _scaler = joblib.load(SCALER_PATH)
            print(f"Scaler loaded from: {SCALER_PATH}")
        except FileNotFoundError:
            raise FileNotFoundError(f"Scaler file not found at: {SCALER_PATH}. Please train the model first.")
    
    return _model, _scaler


def predict_fraud(transaction: TransactionInput) -> PredictionOutput:
    """
    Predict if a transaction is fraudulent.
    
    Args:
        transaction: TransactionInput object with transaction data
        
    Returns:
        PredictionOutput with prediction results
    """
    # Load model and scaler
    model, scaler = load_model()
    
    # Extract features from input
    features = np.array([[
        transaction.transaction_amount,
        transaction.transaction_hour,
        transaction.merchant_risk_score,
        transaction.customer_age_days,
        transaction.transaction_count_24h,
        transaction.avg_transaction_amount_7d,
        transaction.is_international
    ]])
    
    # Scale features
    features_scaled = scaler.transform(features)
    
    # Make prediction
    fraud_probability = model.predict_proba(features_scaled)[0][1]
    is_fraud = fraud_probability >= 0.5
    
    # Determine risk level
    if fraud_probability < 0.3:
        risk_level = "low"
    elif fraud_probability < 0.7:
        risk_level = "medium"
    else:
        risk_level = "high"
    
    # Create message
    if is_fraud:
        message = f"Warning: High fraud risk detected ({fraud_probability:.1%} probability)"
    else:
        message = f"Transaction appears legitimate ({fraud_probability:.1%} fraud probability)"
    
    return PredictionOutput(
        is_fraud=is_fraud,
        fraud_probability=round(fraud_probability, 4),
        risk_level=risk_level,
        message=message
    )
