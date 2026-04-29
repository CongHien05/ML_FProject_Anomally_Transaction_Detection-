import base64
import hashlib
import hmac
import json
import os
from datetime import datetime, timedelta

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Account, User
from schemas import UserProfileResponse


AUTH_SECRET_KEY = os.getenv("AUTH_SECRET_KEY", "dev-secret-change-me")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "720"))


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def verify_password(password: str, password_hash: str) -> bool:
    return hmac.compare_digest(hash_password(password), password_hash)


def _b64_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _b64_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def create_access_token(user: User) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": str(user.id),
        "username": user.username,
        "role": user.role,
        "exp": int((datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)).timestamp()),
    }

    header_part = _b64_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_part = _b64_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_part}.{payload_part}".encode("utf-8")
    signature = hmac.new(AUTH_SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
    return f"{header_part}.{payload_part}.{_b64_encode(signature)}"


def decode_access_token(token: str) -> dict:
    try:
        header_part, payload_part, signature_part = token.split(".")
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc

    signing_input = f"{header_part}.{payload_part}".encode("utf-8")
    expected_signature = hmac.new(AUTH_SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
    actual_signature = _b64_decode(signature_part)

    if not hmac.compare_digest(expected_signature, actual_signature):
        raise HTTPException(status_code=401, detail="Invalid token signature")

    payload = json.loads(_b64_decode(payload_part))
    if int(payload.get("exp", 0)) < int(datetime.utcnow().timestamp()):
        raise HTTPException(status_code=401, detail="Token expired")

    return payload


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    payload = decode_access_token(authorization.removeprefix("Bearer ").strip())
    user_id = int(payload["sub"])
    user = db.query(User).filter(User.id == user_id).one_or_none()
    if user is None or user.status != "ACTIVE":
        raise HTTPException(status_code=401, detail="User is not active")

    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin role is required")
    return current_user


def build_user_profile(db: Session, user: User) -> UserProfileResponse:
    account = db.query(Account).filter(Account.user_id == user.id).order_by(Account.id).first()
    return UserProfileResponse(
        id=user.id,
        username=user.username,
        full_name=user.full_name,
        phone_number=user.phone_number,
        role=user.role,
        status=user.status,
        account_id=account.id if account else None,
        balance=float(account.balance) if account else None,
        currency=account.currency if account else None,
    )
