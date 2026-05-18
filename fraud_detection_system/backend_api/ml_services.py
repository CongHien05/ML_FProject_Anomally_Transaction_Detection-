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

    # All transaction types present in the PaySim training data
    KNOWN_TYPES = ["CASH_IN", "CASH_OUT", "DEBIT", "PAYMENT", "TRANSFER"]

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
        Build feature DataFrame matching the exact 20-column schema from X_train_final.csv:

        Categorical (one-hot):
            categorical__type_CASH_IN, categorical__type_CASH_OUT, categorical__type_DEBIT,
            categorical__type_PAYMENT, categorical__type_TRANSFER

        Numeric:
            numeric__step, numeric__amount, numeric__oldbalanceOrg, numeric__newbalanceOrig,
            numeric__oldbalanceDest, numeric__newbalanceDest,
            numeric__log_amount, numeric__amount_is_zero,
            numeric__oldbalanceOrg_is_zero, numeric__dest_balance_is_zero,
            numeric__origin_balance_delta, numeric__destination_balance_delta,
            numeric__errorBalanceOrig, numeric__errorBalanceDest,
            numeric__amount_to_origin_balance_ratio
        """
        import math

        amount        = float(tx.amount)
        oldbalanceOrg = float(tx.oldbalanceOrg)
        newbalanceOrig= float(tx.newbalanceOrig)
        oldbalanceDest= float(tx.oldbalanceDest)
        newbalanceDest= float(tx.newbalanceDest)
        tx_type       = tx.type.upper()

        errorBalanceOrig = newbalanceOrig + amount - oldbalanceOrg
        errorBalanceDest = oldbalanceDest + amount - newbalanceDest

        data = {
            # One-hot encoded type
            "categorical__type_CASH_IN":  1 if tx_type == "CASH_IN"  else 0,
            "categorical__type_CASH_OUT": 1 if tx_type == "CASH_OUT" else 0,
            "categorical__type_DEBIT":    1 if tx_type == "DEBIT"    else 0,
            "categorical__type_PAYMENT":  1 if tx_type == "PAYMENT"  else 0,
            "categorical__type_TRANSFER": 1 if tx_type == "TRANSFER" else 0,

            # Raw numeric
            "numeric__step":              int(tx.step),
            "numeric__amount":            amount,
            "numeric__oldbalanceOrg":     oldbalanceOrg,
            "numeric__newbalanceOrig":    newbalanceOrig,
            "numeric__oldbalanceDest":    oldbalanceDest,
            "numeric__newbalanceDest":    newbalanceDest,

            # Engineered numeric
            "numeric__log_amount":                   math.log1p(amount),
            "numeric__amount_is_zero":               1 if amount == 0 else 0,
            "numeric__oldbalanceOrg_is_zero":        1 if oldbalanceOrg == 0 else 0,
            "numeric__dest_balance_is_zero":         1 if oldbalanceDest == 0 else 0,
            "numeric__origin_balance_delta":         newbalanceOrig - oldbalanceOrg,
            "numeric__destination_balance_delta":    newbalanceDest - oldbalanceDest,
            "numeric__errorBalanceOrig":             errorBalanceOrig,
            "numeric__errorBalanceDest":             errorBalanceDest,
            "numeric__amount_to_origin_balance_ratio": amount / oldbalanceOrg if oldbalanceOrg > 0 else 0.0,
        }

        expected_columns = [
            "categorical__type_CASH_IN", "categorical__type_CASH_OUT",
            "categorical__type_DEBIT", "categorical__type_PAYMENT",
            "categorical__type_TRANSFER",
            "numeric__step", "numeric__amount",
            "numeric__oldbalanceOrg", "numeric__newbalanceOrig",
            "numeric__oldbalanceDest", "numeric__newbalanceDest",
            "numeric__log_amount", "numeric__amount_is_zero",
            "numeric__oldbalanceOrg_is_zero", "numeric__dest_balance_is_zero",
            "numeric__origin_balance_delta", "numeric__destination_balance_delta",
            "numeric__errorBalanceOrig", "numeric__errorBalanceDest",
            "numeric__amount_to_origin_balance_ratio",
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
            explanations.append("Giao dịch chuyển tiền và rút tiền có xác suất gian lận cao hơn các loại khác.")

        if tx.newbalanceOrig == 0 and tx.amount > 0:
            explanations.append("Giao dịch này sẽ rút cạn toàn bộ số dư tài khoản nguồn.")

        error_orig = tx.newbalanceOrig + tx.amount - tx.oldbalanceOrg
        if abs(error_orig) > 10:
            explanations.append("Số dư tài khoản nguồn sau giao dịch không khớp với số tiền đã giao dịch.")

        error_dest = tx.oldbalanceDest + tx.amount - tx.newbalanceDest
        if abs(error_dest) > 10:
            explanations.append("Số dư tài khoản đích sau giao dịch không khớp với số tiền đã nhận.")

        if tx.amount > 5_000_000:
            explanations.append(f"Số tiền giao dịch ({tx.amount:,.0f} VND) cao bất thường.")

        if not explanations:
            explanations.append("Không phát hiện dấu hiệu bất thường nào từ mô hình AI.")
            
        return PredictionResponse(
            risk_score=risk_score,
            risk_level=risk_level,
            explanations=explanations
        )

# Instantiate the singleton instance for easy imports if needed
fraud_service = FraudDetectionService()
