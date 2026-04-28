import os

import joblib
import pandas as pd

from schemas import PredictionResponse, TransactionRequest


class FraudDetectionService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            instance = super(FraudDetectionService, cls).__new__(cls)
            instance._load_model()
            cls._instance = instance
        return cls._instance

    def _load_model(self):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        model_file = os.getenv("MODEL_FILE", os.getenv("MODEL_VERSION", "fraud_detection_pipeline.pkl"))
        model_path = os.path.normpath(
            os.path.join(base_dir, "..", "machine_learning", "models", model_file)
        )

        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found at: {model_path}")

        self.model = joblib.load(model_path)
        self.model_path = model_path
        print(f"[FraudDetectionService] Loaded model from: {model_path}")

    def _engineer_features(self, tx: TransactionRequest) -> pd.DataFrame:
        """
        Build the raw inference dataframe expected by fraud_detection_pipeline.pkl.
        The saved pipeline already includes StandardScaler, OneHotEncoder, and RandomForest.
        """
        error_balance_orig = tx.newbalanceOrig + tx.amount - tx.oldbalanceOrg
        error_balance_dest = tx.oldbalanceDest + tx.amount - tx.newbalanceDest

        return pd.DataFrame([
            {
                "step": int(tx.step),
                "type": tx.type.upper(),
                "amount": float(tx.amount),
                "oldbalanceOrg": float(tx.oldbalanceOrg),
                "newbalanceOrig": float(tx.newbalanceOrig),
                "oldbalanceDest": float(tx.oldbalanceDest),
                "newbalanceDest": float(tx.newbalanceDest),
                "errorBalanceOrig": float(error_balance_orig),
                "errorBalanceDest": float(error_balance_dest),
            }
        ])

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
            explanations.append(f"Loai giao dich '{tx.type}' co xac suat gian lan cao hon.")

        if tx.newbalanceOrig == 0 and tx.amount > 0:
            explanations.append("Dau hieu rut can tai khoan: so du nguon ve 0 sau giao dich.")

        error_orig = tx.newbalanceOrig + tx.amount - tx.oldbalanceOrg
        if abs(error_orig) > 10:
            explanations.append(f"Sai lech so du phia nguon (errorBalanceOrig = {error_orig:,.2f}).")

        error_dest = tx.oldbalanceDest + tx.amount - tx.newbalanceDest
        if abs(error_dest) > 10:
            explanations.append(f"Sai lech so du phia dich (errorBalanceDest = {error_dest:,.2f}).")

        if tx.amount > 200_000:
            explanations.append(f"So tien giao dich ({tx.amount:,.0f}) vuot muc binh thuong.")

        if not explanations:
            explanations.append("Giao dich binh thuong - khong phat hien dau hieu bat thuong.")

        return PredictionResponse(
            risk_score=risk_score,
            risk_level=risk_level,
            explanations=explanations,
        )
