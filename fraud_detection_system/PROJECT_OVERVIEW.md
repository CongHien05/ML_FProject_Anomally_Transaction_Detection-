# Credit Card Fraud Detection System — Project Overview

> Phân tích tự động toàn bộ codebase. Cập nhật lần cuối: 2026-05-18

---

## Directory Tree

```
fraud_detection_system/
│
├── PROJECT_OVERVIEW.md              ← File này
├── Flow2.md                         ← Tài liệu flow nghiệp vụ
├── FlowNew.md                       ← Tài liệu flow cập nhật
│
├── machine_learning/
│   ├── data/
│   │   ├── paysim_dummy.csv         ← Dataset mẫu PaySim
│   │   ├── X_train_final.csv        ← Features đã xử lý (train)
│   │   ├── X_test_final.csv         ← Features đã xử lý (test)
│   │   ├── y_train.csv              ← Labels train
│   │   └── y_test.csv               ← Labels test
│   ├── models/
│   │   ├── fraud_detection_pipeline.pkl  ← Model chính (dùng cho backend)
│   │   └── fraud_rf_model_tuned.pkl      ← Model RF đã tuning
│   ├── notebooks/
│   │   ├── 01_EDA.ipynb                  ← Phân tích dữ liệu khám phá
│   │   ├── 03_Model_Training_Evaluation.ipynb ← Train + đánh giá model
│   │   └── 03_Real_Data_Training.ipynb   ← Train với dữ liệu thực
│   └── src/
│       ├── preprocess.py            ← Tiền xử lý dữ liệu
│       ├── train.py                 ← Pipeline train model
│       ├── train_chat_intent.py     ← Train model phân loại intent chat
│       └── utils.py                 ← Hàm tiện ích (load/save)
│
├── backend_api/
│   ├── main.py                      ← FastAPI app + toàn bộ routes
│   ├── models.py                    ← SQLAlchemy ORM models (DB schema)
│   ├── schemas.py                   ← Pydantic schemas (request/response)
│   ├── database.py                  ← Kết nối MySQL + session
│   ├── ml_services.py               ← Singleton load model + predict
│   ├── transaction_service.py       ← Logic nghiệp vụ giao dịch
│   ├── auth_service.py              ← JWT auth + hash password
│   ├── chat_service.py              ← RAG chatbot service
│   ├── chat_ml_service.py           ← ML phân loại intent chat
│   ├── otp_service.py               ← OTP phone verification
│   ├── seed_database.py             ← Seed data mẫu vào DB
│   ├── test_predict.py              ← Test nhanh model predict
│   ├── config.py                    ← Cấu hình pandas display
│   └── requirements.txt             ← Python dependencies
│
└── frontend_app/
    ├── index.html                   ← Entry HTML (Vite)
    ├── package.json                 ← Vite + React + React Router
    ├── vite.config.js               ← Vite config + proxy /api
    └── src/
        ├── main.jsx                 ← React entry point
        ├── App.jsx                  ← Root component + Toaster
        ├── index.css                ← Global styles
        ├── routes/
        │   └── AppRoutes.jsx        ← React Router định nghĩa routes
        ├── services/
        │   ├── api.js               ← API client (fetch wrapper)
        │   └── auth.js              ← Auth helpers (token, parse VND)
        ├── components/
        │   ├── chat/
        │   │   └── UserChatBot.tsx  ← Chatbot UI floating button
        │   ├── layout/
        │   │   ├── AdminLayout.tsx  ← Layout cho trang admin
        │   │   ├── AdminSidebar.tsx ← Sidebar admin
        │   │   ├── UserLayout.tsx   ← Layout cho trang user
        │   │   ├── UserSidebar.tsx  ← Sidebar user
        │   │   └── Navbar.tsx       ← Thanh điều hướng chính
        │   └── ui/
        │       ├── StatCard.tsx     ← Card hiển thị thống kê
        │       ├── StatusBadge.tsx  ← Badge trạng thái (risk level)
        │       └── TransactionRow.tsx ← Row hiển thị giao dịch
        └── pages/
            ├── auth/
            │   ├── LoginPage.tsx    ← Trang đăng nhập
            │   └── RegisterPage.tsx ← Trang đăng ký
            ├── admin/
            │   ├── AdminDashboard.tsx     ← Dashboard tổng quan admin
            │   ├── AllTransactionsPage.tsx ← Danh sách tất cả giao dịch
            │   ├── AlertsPage.tsx         ← Quản lý cảnh báo fraud
            │   └── AccountsPage.tsx       ← Quản lý tài khoản user
            ├── user/
            │   ├── TransferPage.tsx  ← Chuyển khoản
            │   ├── CashOutPage.tsx   ← Rút tiền
            │   └── HistoryPage.tsx   ← Lịch sử giao dịch
            └── errors/
                └── NotFoundPage.tsx  ← Trang 404
```

---

## Module Summary

### 1. `machine_learning/` — Huấn luyện mô hình ML

| Thành phần | Chức năng |
|-----------|-----------|
| `data/paysim_dummy.csv` | Dataset mô phỏng giao dịch tài chính theo chuẩn PaySim |
| `notebooks/01_EDA.ipynb` | Phân tích khám phá dữ liệu (phân phối, correlation, class imbalance) |
| `notebooks/03_Model_Training_Evaluation.ipynb` | Train và đánh giá model (accuracy, F1, ROC-AUC) |
| `src/preprocess.py` | Làm sạch dữ liệu, StandardScaler, train-test split |
| `src/train.py` | Pipeline train RandomForest + SMOTE, lưu `.pkl` |
| `src/train_chat_intent.py` | Train model phân loại intent của chatbot |
| `models/fraud_detection_pipeline.pkl` | **Model chính được backend sử dụng** (sklearn Pipeline: OneHotEncoder + RF) |

**Features đầu vào của model:**
`step`, `type`, `amount`, `oldbalanceOrg`, `newbalanceOrig`, `oldbalanceDest`, `newbalanceDest`, `errorBalanceOrig`*, `errorBalanceDest`*
> (*) Tính toán thêm trong `ml_services.py` — Feature Engineering

---

### 2. `backend_api/` — FastAPI Server

**Database:** MySQL (`fraud_detection_db`) qua SQLAlchemy ORM

**DB Tables:**

| Bảng | Mô tả |
|------|-------|
| `users` | Tài khoản người dùng (role: USER / ADMIN) |
| `accounts` | Tài khoản ngân hàng, số dư VND |
| `transactions` | Lịch sử giao dịch (TRANSFER, CASH_IN, CASH_OUT, PAYMENT) |
| `fraud_predictions` | Kết quả dự đoán ML cho từng giao dịch |
| `admin_reviews` | Hành động review của admin (APPROVE/REJECT/BAN...) |
| `alerts` | Cảnh báo fraud gửi đến admin |
| `otp_verifications` | OTP xác thực số điện thoại |
| `chat_messages` | Lịch sử hội thoại chatbot |

**API Endpoints:**

| Nhóm | Endpoint | Mô tả |
|------|----------|-------|
| **Auth** | `POST /api/v1/auth/login` | Đăng nhập, trả JWT |
| | `POST /api/v1/auth/register` | Đăng ký user mới + tạo account |
| | `GET /api/v1/auth/me` | Lấy thông tin user hiện tại |
| | `POST /api/v1/auth/phone/request-otp` | Gửi OTP xác thực SĐT |
| | `POST /api/v1/auth/phone/verify-otp` | Xác minh OTP SĐT |
| **Transaction** | `POST /api/v1/transactions` | Tạo giao dịch mới (chạy ML ngay) |
| | `POST /api/v1/transactions/{id}/verify-otp` | Xác nhận giao dịch bằng OTP |
| | `GET /api/v1/transactions/me` | Lịch sử giao dịch của user |
| **ML Predict** | `POST /api/v1/predict/advanced` | Dự đoán fraud theo format PaySim |
| **Admin** | `GET /api/v1/admin/dashboard` | Tổng quan dashboard admin |
| | `GET /api/v1/admin/transactions` | Tất cả giao dịch |
| | `GET /api/v1/admin/fraud-predictions` | Danh sách dự đoán high-risk |
| | `POST /api/v1/admin/fraud-predictions/{id}/review` | Admin review giao dịch |
| | `GET /api/v1/admin/alerts` | Danh sách cảnh báo fraud |
| | `PATCH /api/v1/admin/alerts/{id}/read` | Đánh dấu đã đọc |
| | `GET /api/v1/admin/accounts` | Quản lý tài khoản |
| | `PATCH /api/v1/admin/accounts/{id}/status` | Khoá/mở tài khoản |
| | `PATCH /api/v1/admin/users/{id}/status` | Ban/unban user |
| **Chat** | `POST /api/chat` | Hỏi chatbot về giao dịch (RAG) |
| | `GET /api/chat/rag` | Lấy RAG snapshot của user |
| **Search** | `GET /api/v1/users/search?username=...` | Tìm user theo username |

**Luồng xử lý giao dịch:**
```
User gửi giao dịch
  → transaction_service.create_transaction()
    → ml_services.FraudDetectionService.predict()   ← Chạy ML
      → Lưu FraudPrediction vào DB
        → Nếu risk_level = High → Tạo Alert + yêu cầu OTP
          → User xác nhận OTP → Giao dịch COMPLETED
```

---

### 3. `frontend_app/` — React + Vite SPA

**Tech stack:** React 18, React Router v6, TypeScript (pages/components), Vite 5

**Routing:**

| Route | Component | Role |
|-------|-----------|------|
| `/login` | `LoginPage` | Public |
| `/register` | `RegisterPage` | Public |
| `/` | `TransferPage` | User |
| `/cash-out` | `CashOutPage` | User |
| `/history` | `HistoryPage` | User |
| `/admin` | `AdminDashboard` | Admin |
| `/admin/transactions` | `AllTransactionsPage` | Admin |
| `/admin/alerts` | `AlertsPage` | Admin |
| `/admin/accounts` | `AccountsPage` | Admin |
| `*` | `NotFoundPage` | Public |

**Luồng UI giao dịch:**
```
TransferPage nhập thông tin
  → api.createTransaction()
    → Nếu risk High → Hiện OTP dialog
      → api.verifyTransactionOtp()
        → Hiển thị kết quả (COMPLETED / BLOCKED)
```

---

## Tech Stack Tổng Quan

```
┌─────────────────────────────────────────────────────────┐
│  Frontend: React 18 + Vite + React Router v6            │
│  Language: JSX / TypeScript                             │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTP (Fetch API / JWT Bearer)
┌─────────────────────▼───────────────────────────────────┐
│  Backend: FastAPI + Uvicorn                             │
│  Auth: JWT (access token)                               │
│  OTP: SMS phone verification                            │
│  Chat: RAG-based chatbot (intent classification)        │
└──────────┬──────────────────────┬───────────────────────┘
           │                      │
  ┌────────▼───────┐    ┌────────▼──────────────┐
  │  MySQL DB      │    │  ML Model (.pkl)       │
  │  SQLAlchemy    │    │  scikit-learn Pipeline  │
  │  8 tables      │    │  RandomForest + OHE    │
  └────────────────┘    └───────────────────────┘
```

---

## Cách Chạy Nhanh

```bash
# 1. Backend (cần MySQL đang chạy)
cd backend_api
pip install -r requirements.txt
python main.py          # → http://localhost:8000

# 2. Frontend
cd frontend_app
npm install
npm run dev             # → http://localhost:3000
```

> **Lưu ý:** Model `fraud_detection_pipeline.pkl` phải tồn tại tại
> `machine_learning/models/fraud_detection_pipeline.pkl` trước khi chạy backend.
> Nếu gặp lỗi version sklearn, chạy: `pip install scikit-learn==1.6.1`
