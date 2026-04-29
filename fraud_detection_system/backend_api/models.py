from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, JSON, Numeric, String, Text
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(128), nullable=False)
    full_name = Column(String(120), nullable=False)
    phone_number = Column(String(20), unique=True, nullable=True, index=True)
    role = Column(String(20), nullable=False, default="USER")
    status = Column(String(20), nullable=False, default="ACTIVE")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    accounts = relationship("Account", back_populates="user")


class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    balance = Column(Numeric(18, 2), nullable=False, default=0)
    currency = Column(String(10), nullable=False, default="VND")
    status = Column(String(20), nullable=False, default="ACTIVE")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="accounts")
    outgoing_transactions = relationship(
        "Transaction",
        back_populates="from_account",
        foreign_keys="Transaction.from_account_id",
    )
    incoming_transactions = relationship(
        "Transaction",
        back_populates="to_account",
        foreign_keys="Transaction.to_account_id",
    )


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(String(80), unique=True, nullable=False, index=True)
    from_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True, index=True)
    to_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True, index=True)
    amount = Column(Numeric(18, 2), nullable=False)
    type = Column(String(20), nullable=False)
    note = Column(Text, nullable=True)
    device_ip = Column(String(45), nullable=True)
    status = Column(String(20), nullable=False, default="PROCESSING")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    from_account = relationship(
        "Account",
        back_populates="outgoing_transactions",
        foreign_keys=[from_account_id],
    )
    to_account = relationship(
        "Account",
        back_populates="incoming_transactions",
        foreign_keys=[to_account_id],
    )
    fraud_prediction = relationship("FraudPrediction", back_populates="transaction", uselist=False)


class FraudPrediction(Base):
    __tablename__ = "fraud_predictions"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=False, unique=True, index=True)
    risk_score = Column(Float, nullable=False)
    risk_level = Column(String(20), nullable=False, index=True)
    explanations = Column(JSON, nullable=False)
    features_snapshot = Column(JSON, nullable=False)
    model_version = Column(String(50), nullable=False, default="fraud_detection_pipeline")
    review_status = Column(String(30), nullable=False, default="PENDING")
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    review_note = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    transaction = relationship("Transaction", back_populates="fraud_prediction")


class AdminReview(Base):
    __tablename__ = "admin_reviews"

    id = Column(Integer, primary_key=True, index=True)
    prediction_id = Column(Integer, ForeignKey("fraud_predictions.id"), nullable=False, index=True)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    action_taken = Column(String(30), nullable=False)
    review_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

    prediction = relationship("FraudPrediction")
    admin = relationship("User")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=False, index=True)
    prediction_id = Column(Integer, ForeignKey("fraud_predictions.id"), nullable=False, index=True)
    type = Column(String(30), nullable=False, default="FRAUD_ALERT")
    risk_level = Column(String(20), nullable=False, index=True)
    title = Column(String(160), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default="UNREAD", index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")
    transaction = relationship("Transaction")
    prediction = relationship("FraudPrediction")


class OtpVerification(Base):
    __tablename__ = "otp_verifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    phone_number = Column(String(20), nullable=False)
    otp_code = Column(String(10), nullable=False)
    is_verified = Column(String(20), nullable=False, default="PENDING", index=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")
