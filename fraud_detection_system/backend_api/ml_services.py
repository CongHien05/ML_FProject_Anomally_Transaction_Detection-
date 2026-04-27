import os
import joblib
import pandas as pd
import numpy as np
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
        model_path = os.path.join(base_dir, "..", "machine_learning", "models", "fraud_rf_model_tuned.pkl")
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

        tx_type = tx.type.upper()
        
        # Build 20 features expected by the random forest model
        data = {
            'categorical__type_CASH_IN': 1.0 if tx_type == 'CASH_IN' else 0.0,
            'categorical__type_CASH_OUT': 1.0 if tx_type == 'CASH_OUT' else 0.0,
            'categorical__type_DEBIT': 1.0 if tx_type == 'DEBIT' else 0.0,
            'categorical__type_PAYMENT': 1.0 if tx_type == 'PAYMENT' else 0.0,
            'categorical__type_TRANSFER': 1.0 if tx_type == 'TRANSFER' else 0.0,
            'numeric__step': float(tx.step),
            'numeric__amount': float(tx.amount),
            'numeric__oldbalanceOrg': float(tx.oldbalanceOrg),
            'numeric__newbalanceOrig': float(tx.newbalanceOrig),
            'numeric__oldbalanceDest': float(tx.oldbalanceDest),
            'numeric__newbalanceDest': float(tx.newbalanceDest),
            'numeric__log_amount': float(np.log1p(tx.amount)),
            'numeric__amount_is_zero': 1.0 if tx.amount == 0 else 0.0,
            'numeric__oldbalanceOrg_is_zero': 1.0 if tx.oldbalanceOrg == 0 else 0.0,
            'numeric__dest_balance_is_zero': 1.0 if (tx.oldbalanceDest == 0 and tx.newbalanceDest == 0) else 0.0,
            'numeric__origin_balance_delta': float(tx.newbalanceOrig - tx.oldbalanceOrg),
            'numeric__destination_balance_delta': float(tx.newbalanceDest - tx.oldbalanceDest),
            'numeric__errorBalanceOrig': float(errorBalanceOrig),
            'numeric__errorBalanceDest': float(errorBalanceDest),
            'numeric__amount_to_origin_balance_ratio': float((tx.amount / tx.oldbalanceOrg) if tx.oldbalanceOrg > 0 else 0.0)
        }
        
        expected_columns = [
            'categorical__type_CASH_IN', 'categorical__type_CASH_OUT',
            'categorical__type_DEBIT', 'categorical__type_PAYMENT',
            'categorical__type_TRANSFER', 'numeric__step', 'numeric__amount',
            'numeric__oldbalanceOrg', 'numeric__newbalanceOrig',
            'numeric__oldbalanceDest', 'numeric__newbalanceDest', 'numeric__log_amount',
            'numeric__amount_is_zero', 'numeric__oldbalanceOrg_is_zero',
            'numeric__dest_balance_is_zero', 'numeric__origin_balance_delta',
            'numeric__destination_balance_delta', 'numeric__errorBalanceOrig',
            'numeric__errorBalanceDest', 'numeric__amount_to_origin_balance_ratio'
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
