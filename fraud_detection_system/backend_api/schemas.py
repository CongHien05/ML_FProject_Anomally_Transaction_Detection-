from typing import Optional
from pydantic import BaseModel, Field

class TransactionRequest(BaseModel):
    step: int
    type: str
    amount: float
    oldbalanceOrg: float
    newbalanceOrig: float
    oldbalanceDest: float
    newbalanceDest: float

class PredictionResponse(BaseModel):
    risk_score: float
    risk_level: str
    explanations: list[str]


class OtpVerifyRequest(BaseModel):
    otp_code: str

class TransactionDecisionResponse(BaseModel):
    transaction_id: int
    status: str
    risk_score: float
    risk_level: str
    next_action: str
    explanations: list[str]

class CreateTransactionRequest(BaseModel):
    request_id: str
    from_account_id: Optional[int] = None
    to_account_id: Optional[int] = None
    amount: float = Field(..., gt=0)
    type: str = Field(..., pattern="^(TRANSFER|CASH_IN|CASH_OUT|PAYMENT)$")
    note: Optional[str] = None
    device_ip: Optional[str] = None


class TransactionSummaryResponse(BaseModel):
    id: int
    request_id: str
    from_account_id: Optional[int] = None
    from_username: Optional[str] = None
    from_full_name: Optional[str] = None
    to_account_id: Optional[int] = None
    to_username: Optional[str] = None
    to_full_name: Optional[str] = None
    amount: float
    type: str
    note: Optional[str] = None
    device_ip: Optional[str] = None
    status: str
    risk_score: Optional[float] = None
    risk_level: Optional[str] = None
    review_status: Optional[str] = None
    explanations: list[str] = Field(default_factory=list)
    features_snapshot: Optional[dict] = None
    created_at: str
    updated_at: str


class AdminReviewRequest(BaseModel):
    action_taken: str = Field(
        ...,
        pattern="^(APPROVE|REJECT|ACCOUNT_FROZEN|USER_BANNED|MARK_FALSE_POSITIVE)$",
    )
    review_notes: Optional[str] = None


class AdminReviewResponse(BaseModel):
    prediction_id: int
    transaction_id: int
    action_taken: str
    review_status: str
    message: str
    transaction: TransactionSummaryResponse


class AccountResponse(BaseModel):
    id: int
    user_id: int
    username: str
    full_name: str
    balance: float
    currency: str
    status: str


class UserCredentialResponse(BaseModel):
    username: str
    password: str
    role: str
    account_id: Optional[int] = None
    balance: Optional[float] = None


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    password: str
    full_name: str
    phone_number: Optional[str] = None


class UserProfileResponse(BaseModel):
    id: int
    username: str
    full_name: str
    phone_number: Optional[str] = None
    role: str
    status: str
    account_id: Optional[int] = None
    balance: Optional[float] = None
    currency: Optional[str] = None


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfileResponse


class AlertResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    username: Optional[str] = None
    transaction_id: int
    prediction_id: int
    request_id: str
    from_account_id: Optional[int] = None
    from_username: Optional[str] = None
    from_full_name: Optional[str] = None
    to_account_id: Optional[int] = None
    to_username: Optional[str] = None
    to_full_name: Optional[str] = None
    device_ip: Optional[str] = None
    type: str
    risk_level: str
    risk_score: float
    title: str
    message: str
    status: str
    amount: float
    transaction_type: str
    transaction_status: str
    review_status: str
    explanations: list[str]
    features_snapshot: Optional[dict] = None
    created_at: str


class AdminDashboardResponse(BaseModel):
    total_users: int
    transactions_24h: int
    high_risk_alerts: int
    blocked_transactions: int
    pending_reviews: int


class RequestPhoneOtpRequest(BaseModel):
    phone_number: str = Field(..., pattern=r'^\+?1?\d{9,15}$')


class RequestPhoneOtpResponse(BaseModel):
    message: str
    phone_number: str
    expires_in_minutes: int


class VerifyPhoneOtpRequest(BaseModel):
    phone_number: str = Field(..., pattern=r'^\+?1?\d{9,15}$')
    otp_code: str = Field(..., pattern=r'^\d{6}$')


class VerifyPhoneOtpResponse(BaseModel):
    message: str
    phone_number: str


class RequestTransactionOtpResponse(BaseModel):
    message: str
    phone_number: str
    expires_in_minutes: int


class RequestTransactionOtpRequest(BaseModel):
    phone_number: str = Field(..., pattern=r'^\+?1?\d{9,15}$')


class VerifyTransactionOtpRequest(BaseModel):
    phone_number: str = Field(..., pattern=r'^\+?1?\d{9,15}$')
    otp_code: str = Field(..., pattern=r'^\d{6}$')


class ChatMessageItem(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str


class ChatRequest(BaseModel):
    question: Optional[str] = None
    message: Optional[str] = None
    message_history: list[ChatMessageItem] = Field(default_factory=list)


class ChatSource(BaseModel):
    kind: str
    transaction_id: Optional[int] = None
    request_id: Optional[str] = None
    snippet: str
    created_at: Optional[str] = None
    score: Optional[float] = None


class ChatResponse(BaseModel):
    success: bool = True
    answer: str
    answer_status: str
    scope: str = "current_user_transactions"
    chat_intent: Optional[str] = None
    chat_intent_confidence: Optional[float] = None
    chat_intent_source: Optional[str] = None
    rag_document_id: Optional[str] = None
    rag_generated_at: Optional[str] = None
    rag_file_name: Optional[str] = None
    rag_write_status: Optional[str] = None
    sources: list[ChatSource] = Field(default_factory=list)


class ChatRagResponse(BaseModel):
    success: bool = True
    document_id: str
    generated_at: str
    scope: str = "current_authenticated_user_only"
    file_name: Optional[str] = None
    write_status: str = "written"
    account_count: int
    transaction_count: int
    included_transaction_count: int
    document: dict
