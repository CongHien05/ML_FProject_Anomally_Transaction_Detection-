import os
import joblib
import pandas as pd
from schemas import TransactionRequest, PredictionResponse

class FraudDetectionService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FraudDetectionService, cls).__new__(cls)
            cls._instance._load_model()
        return cls._instance

    def _load_model(self):

        base_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(base_dir, "..", "machine_learning", "models", "fraud_detection_pipeline.pkl")
        model_path = os.path.normpath(model_path)
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found at: {model_path}")
            
        self.model = joblib.load(model_path)
        print(f"[FraudDetectionService] Loaded model from: {model_path}")

    def _engineer_features(self, tx: TransactionRequest) -> pd.DataFrame:
        """
        Tính toán thêm 2 features mở rộng (Feature Engineering) là errorBalanceOrig và errorBalanceDest
        trước khi đưa vào hàm dự đoán của model.
        """
        errorBalanceOrig = tx.newbalanceOrig + tx.amount - tx.oldbalanceOrg
        errorBalanceDest = tx.oldbalanceDest + tx.amount - tx.newbalanceDest

        data = {
            "step": int(tx.step),
            "type": tx.type.upper(),
            "amount": float(tx.amount),
            "oldbalanceOrg": float(tx.oldbalanceOrg),
            "newbalanceOrig": float(tx.newbalanceOrig),
            "oldbalanceDest": float(tx.oldbalanceDest),
            "newbalanceDest": float(tx.newbalanceDest),
            "errorBalanceOrig": float(errorBalanceOrig),
            "errorBalanceDest": float(errorBalanceDest),
        }
        
        expected_columns = [
            "step",
            "type",
            "amount",
            "oldbalanceOrg",
            "newbalanceOrig",
            "oldbalanceDest",
            "newbalanceDest",
            "errorBalanceOrig",
            "errorBalanceDest",
        ]
        
        return pd.DataFrame([data])[expected_columns]

    def predict(self, tx: TransactionRequest) -> PredictionResponse:
        df = self._engineer_features(tx)
        
        fraud_prob = float(self.model.predict_proba(df)[0][1])
        risk_score = round(fraud_prob * 100, 2)
        
        if fraud_prob > 0.8:
            risk_level = "High"
        elif fraud_prob > 0.4:
            risk_level = "Medium"
        else:
            risk_level = "Low"
            
        explanations = []
        if tx.type.upper() in {"TRANSFER", "CASH_OUT"}:
            explanations.append(f"Loại giao dịch '{tx.type}' có xác suất gian lận cao hơn.")
            
        if tx.newbalanceOrig == 0 and tx.amount > 0:
            explanations.append("Dấu hiệu rút cạn tài khoản: số dư tài khoản nguồn về 0 sau giao dịch.")
            
        error_orig = tx.newbalanceOrig + tx.amount - tx.oldbalanceOrg
        if abs(error_orig) > 10:
            explanations.append(f"Sai lệch số dư phía nguồn (errorBalanceOrig = {error_orig:,.2f}).")
            
        error_dest = tx.oldbalanceDest + tx.amount - tx.newbalanceDest
        if abs(error_dest) > 10:
            explanations.append(f"Sai lệch số dư phía đích (errorBalanceDest = {error_dest:,.2f}).")
            
        if tx.amount > 200_000:
            explanations.append(f"Số tiền giao dịch ({tx.amount:,.0f}) vượt mức bình thường.")
            
        if not explanations:
            explanations.append("Giao dịch bình thường — không phát hiện dấu hiệu bất thường.")
            
        return PredictionResponse(
            risk_score=risk_score,
            risk_level=risk_level,
            explanations=explanations
        )

# Instantiate the singleton instance for easy imports if needed
fraud_service = FraudDetectionService()
