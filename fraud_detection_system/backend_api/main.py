from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from auth_service import build_user_profile, create_access_token, get_current_user, require_admin, verify_password
from database import get_db, init_db
from ml_services import FraudDetectionService
from models import Account, User
from otp_service import request_phone_otp, verify_phone_otp, request_transaction_otp, verify_transaction_otp
from schemas import (
    AccountResponse,
    AdminDashboardResponse,
    AdminReviewRequest,
    AdminReviewResponse,
    AlertResponse,
    CreateTransactionRequest,
    LoginRequest,
    LoginResponse,
    OtpVerifyRequest,
    PredictionResponse,
    RequestPhoneOtpRequest,
    RequestPhoneOtpResponse,
    RequestTransactionOtpRequest,
    RequestTransactionOtpResponse,
    TransactionDecisionResponse,
    TransactionRequest,
    TransactionSummaryResponse,
    UserProfileResponse,
    VerifyPhoneOtpRequest,
    VerifyPhoneOtpResponse,
    VerifyTransactionOtpRequest,
)
from transaction_service import (
    create_transaction,
    get_admin_dashboard_summary,
    get_admin_alerts,
    get_high_risk_predictions,
    list_admin_transactions,
    list_user_transactions,
    mark_alert_read,
    review_fraud_prediction,
    verify_pending_transaction,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        init_db()
        print("[Startup] MySQL database is ready.")
    except Exception as exc:
        print(f"[Startup DB WARNING] {exc}")

    try:
        FraudDetectionService()
        print("[Startup] ML model loaded and ready.")
    except Exception as exc:
        print(f"[Startup ML WARNING] {exc}")

    yield
    print("[Shutdown] Fraud Detection API stopped.")


app = FastAPI(
    title="Fraud Detection API",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/api/v1/auth/login", response_model=LoginResponse)
async def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username).one_or_none()
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    if user.status != "ACTIVE":
        raise HTTPException(status_code=403, detail="User account is not active")

    return LoginResponse(
        access_token=create_access_token(user),
        user=build_user_profile(db, user),
    )


@app.get("/api/v1/auth/me", response_model=UserProfileResponse)
async def me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return build_user_profile(db, current_user)


@app.post("/api/v1/predict/advanced", response_model=PredictionResponse)
async def predict_advanced(data: TransactionRequest) -> PredictionResponse:
    try:
        service = FraudDetectionService()
        return service.predict(data)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction error: {exc}")


@app.post("/api/v1/transactions", response_model=TransactionDecisionResponse)
async def submit_transaction(
    request: Request,
    data: CreateTransactionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not data.device_ip:
        forwarded_for = request.headers.get("x-forwarded-for")
        client_ip = forwarded_for.split(",")[0].strip() if forwarded_for else None
        if not client_ip and request.client is not None:
            client_ip = request.client.host

        if client_ip:
            if hasattr(data, "model_copy"):
                data = data.model_copy(update={"device_ip": client_ip})
            else:
                data = data.copy(update={"device_ip": client_ip})

    return create_transaction(db, data, current_user)


@app.post("/api/v1/transactions/{transaction_id}/verify-otp", response_model=TransactionDecisionResponse)
async def verify_otp(
    transaction_id: int,
    data: VerifyTransactionOtpRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return verify_pending_transaction(db, transaction_id, data.phone_number, data.otp_code, current_user)


@app.post("/api/v1/auth/phone/request-otp", response_model=RequestPhoneOtpResponse)
async def request_phone_otp_endpoint(
    data: RequestPhoneOtpRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Request OTP for phone number verification."""
    return request_phone_otp(db, current_user.id, data.phone_number)


@app.post("/api/v1/auth/phone/verify-otp", response_model=VerifyPhoneOtpResponse)
async def verify_phone_otp_endpoint(
    data: VerifyPhoneOtpRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Verify phone number with OTP code."""
    return verify_phone_otp(db, current_user.id, data.phone_number, data.otp_code)


@app.post("/api/v1/transactions/request-otp", response_model=RequestTransactionOtpResponse)
async def request_transaction_otp_endpoint(
    data: RequestTransactionOtpRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Request OTP for transaction verification with phone number validation."""
    return request_transaction_otp(db, current_user.id, data.phone_number)


@app.get("/api/v1/transactions/me", response_model=list[TransactionSummaryResponse])
async def list_my_transactions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_user_transactions(db, current_user)


@app.get("/api/v1/admin/dashboard", response_model=AdminDashboardResponse)
async def admin_dashboard(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return get_admin_dashboard_summary(db)


@app.get("/api/v1/admin/transactions", response_model=list[TransactionSummaryResponse])
async def admin_transactions(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return list_admin_transactions(db)


@app.get("/api/v1/admin/fraud-predictions")
async def list_fraud_predictions(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return get_high_risk_predictions(db)


@app.post("/api/v1/admin/fraud-predictions/{prediction_id}/review", response_model=AdminReviewResponse)
async def review_prediction(
    prediction_id: int,
    data: AdminReviewRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return review_fraud_prediction(db, prediction_id, data, admin)


@app.get("/api/v1/admin/alerts", response_model=list[AlertResponse])
async def list_admin_alerts(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return get_admin_alerts(db)


@app.patch("/api/v1/admin/alerts/{alert_id}/read")
async def read_admin_alert(
    alert_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return mark_alert_read(db, alert_id)


@app.get("/api/v1/users/search")
async def search_user(
    username: str,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Search for a user account by username."""
    user = db.query(User).filter(User.username == username).one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    account = db.query(Account).filter(Account.user_id == user.id).one_or_none()
    if account is None:
        raise HTTPException(status_code=404, detail="Account not found")
    
    return {
        "user_id": user.id,
        "account_id": account.id,
        "username": user.username,
        "full_name": user.full_name,
        "balance": float(account.balance),
        "currency": account.currency,
        "status": account.status,
    }


@app.get("/api/v1/dev/accounts", response_model=list[AccountResponse])
async def list_dev_accounts(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Account, User)
        .join(User, Account.user_id == User.id)
        .order_by(Account.id)
        .all()
    )
    return [
        AccountResponse(
            id=account.id,
            user_id=user.id,
            username=user.username,
            full_name=user.full_name,
            balance=float(account.balance),
            currency=account.currency,
            status=account.status,
        )
        for account, user in rows
    ]
