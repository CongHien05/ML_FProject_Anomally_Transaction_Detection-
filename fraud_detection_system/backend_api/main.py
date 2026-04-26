from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd

# Khởi tạo Web Server
app = FastAPI(title="Fraud Detection AI Engine")

# Cấu hình CORS để cho phép React (chạy ở cổng 5173/3000) gọi API không bị lỗi chặn
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load mô hình ngay khi khởi động Server
pipeline = joblib.load('../machine_learning/models/fraud_detection_pipeline.pkl')

# Định nghĩa khuôn mẫu dữ liệu nhận từ Frontend
class TransactionData(BaseModel):
    step: int
    type: str
    amount: float
    oldbalanceOrg: float
    newbalanceOrig: float
    oldbalanceDest: float
    newbalanceDest: float

@app.post("/api/v1/predict/advanced")
async def predict_fraud(data: TransactionData):
    # 1. Tính toán Feature Engineering
    error_balance_orig = data.newbalanceOrig + data.amount - data.oldbalanceOrg
    error_balance_dest = data.oldbalanceDest + data.amount - data.newbalanceDest
    
    # 2. Đóng gói thành DataFrame
    df = pd.DataFrame([{
        "step": data.step,
        "type": data.type,
        "amount": data.amount,
        "oldbalanceOrg": data.oldbalanceOrg,
        "newbalanceOrig": data.newbalanceOrig,
        "oldbalanceDest": data.oldbalanceDest,
        "newbalanceDest": data.newbalanceDest,
        "errorBalanceOrig": error_balance_orig,
        "errorBalanceDest": error_balance_dest
    }])
    
    # 3. Model dự đoán
    prob = pipeline.predict_proba(df)[0][1] # Xác suất gian lận
    
    # 4. Phân loại mức độ rủi ro và tạo lời giải thích
    explanations = []
    if error_balance_orig < -10 or error_balance_orig > 10:
        explanations.append(f"Cảnh báo: Sai lệch số dư đầu nguồn (Error = {error_balance_orig})")
    if data.newbalanceOrig == 0 and data.amount > 0:
        explanations.append("Dấu hiệu rút cạn tài khoản được phát hiện.")
        
    if prob > 0.8:
        risk_level = "High"
    elif prob > 0.4:
        risk_level = "Medium"
    else:
        risk_level = "Low"
        explanations.append("Giao dịch bình thường, khớp luồng tiền.")

    # Trả về JSON đúng chuẩn mà React đang mong đợi
    return {
        "riskLevel": risk_level,
        "riskScore": round(prob * 100, 2),
        "fraudProbability": round(prob, 4),
        "isFraud": bool(prob > 0.5),
        "explanations": explanations
    }

# Lệnh để chạy server: uvicorn main:app --reload