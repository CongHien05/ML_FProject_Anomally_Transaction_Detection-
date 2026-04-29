import random
import string
from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy.orm import Session

from models import OtpVerification, User


def generate_otp() -> str:
    """Generate a 6-digit OTP code."""
    return ''.join(random.choices(string.digits, k=6))


def send_otp_to_phone(phone_number: str, otp_code: str) -> bool:
    """
    Send OTP to phone number - Development mode.
    OTP is printed to backend terminal instead of real SMS.
    """
    print("=" * 50)
    print(f"[DEV OTP] Phone: {phone_number}")
    print(f"[DEV OTP] Code : {otp_code}")
    print("=" * 50)
    return True

def request_phone_otp(
    db: Session,
    user_id: int,
    phone_number: str,
) -> dict:
    """
    Generate OTP for phone verification and send it via SMS.
    """
    user = db.query(User).filter(User.id == user_id).one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if another user already has this phone number
    existing_phone = db.query(User).filter(
        User.phone_number == phone_number,
        User.id != user_id
    ).one_or_none()
    if existing_phone is not None:
        raise HTTPException(status_code=400, detail="Phone number already registered to another user")

    # Invalidate previous OTP requests for this user
    previous_otps = db.query(OtpVerification).filter(
        OtpVerification.user_id == user_id,
        OtpVerification.is_verified == "PENDING"
    ).all()
    for otp_record in previous_otps:
        otp_record.is_verified = "EXPIRED"
    db.flush()

    # Generate new OTP
    otp_code = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=5)

    otp_record = OtpVerification(
        user_id=user_id,
        phone_number=phone_number,
        otp_code=otp_code,
        is_verified="PENDING",
        expires_at=expires_at,
    )
    db.add(otp_record)
    db.commit()

    # Send OTP via SMS (simulated)
    send_otp_to_phone(phone_number, otp_code)

    return {
        "message": f"OTP sent to {phone_number}",
        "phone_number": phone_number,
        "expires_in_minutes": 5,
    }


def verify_phone_otp(
    db: Session,
    user_id: int,
    phone_number: str,
    otp_code: str,
) -> dict:
    """
    Verify OTP code and update user's phone number.
    """
    user = db.query(User).filter(User.id == user_id).one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    # Find the most recent OTP record for this user
    otp_record = db.query(OtpVerification).filter(
        OtpVerification.user_id == user_id,
        OtpVerification.phone_number == phone_number,
        OtpVerification.is_verified == "PENDING",
    ).order_by(OtpVerification.created_at.desc()).first()

    if otp_record is None:
        raise HTTPException(status_code=400, detail="No pending OTP request found for this phone number")

    if datetime.utcnow() > otp_record.expires_at:
        otp_record.is_verified = "EXPIRED"
        db.commit()
        raise HTTPException(status_code=400, detail="OTP code has expired")

    if otp_record.otp_code != otp_code:
        raise HTTPException(status_code=400, detail="Invalid OTP code")

    # Mark OTP as verified
    otp_record.is_verified = "VERIFIED"
    user.phone_number = phone_number
    db.commit()

    return {
        "message": "Phone number verified successfully",
        "phone_number": phone_number,
    }


def verify_transaction_otp(
    db: Session,
    user_id: int,
    phone_number: str,
    otp_code: str,
) -> bool:
    """
    Verify transaction OTP.
    Generates and sends a new OTP for transaction verification.
    """
    user = db.query(User).filter(User.id == user_id).one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if user has this phone number registered
    if user.phone_number is None:
        raise HTTPException(status_code=400, detail="User has no verified phone number")

    if user.phone_number != phone_number:
        raise HTTPException(status_code=400, detail="Phone number does not match registered phone")

    # Find the OTP record for this transaction
    otp_record = db.query(OtpVerification).filter(
        OtpVerification.user_id == user_id,
        OtpVerification.phone_number == phone_number,
        OtpVerification.is_verified == "PENDING",
    ).order_by(OtpVerification.created_at.desc()).first()

    if otp_record is None:
        raise HTTPException(status_code=400, detail="No pending OTP request found")

    if datetime.utcnow() > otp_record.expires_at:
        otp_record.is_verified = "EXPIRED"
        db.commit()
        raise HTTPException(status_code=400, detail="OTP code has expired")

    if otp_record.otp_code != otp_code:
        raise HTTPException(status_code=400, detail="Invalid OTP code")

    # Mark OTP as verified
    otp_record.is_verified = "VERIFIED"
    db.commit()

    return True


def request_transaction_otp(
    db: Session,
    user_id: int,
    phone_number: str,
) -> dict:
    """
    Verify phone number and generate OTP for a specific transaction.
    Phone number MUST match the registered phone number exactly.
    """
    user = db.query(User).filter(User.id == user_id).one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if user.phone_number is None:
        raise HTTPException(status_code=400, detail="User has no registered phone number")

    # Check if phone number matches exactly
    if user.phone_number != phone_number:
        raise HTTPException(status_code=400, detail="Phone number does not match registered phone")

    # Invalidate previous transaction OTPs for this user
    previous_otps = db.query(OtpVerification).filter(
        OtpVerification.user_id == user_id,
        OtpVerification.is_verified == "PENDING",
    ).all()
    for otp_record in previous_otps:
        otp_record.is_verified = "EXPIRED"
    db.flush()

    # Generate new OTP for transaction
    otp_code = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=5)

    otp_record = OtpVerification(
        user_id=user_id,
        phone_number=user.phone_number,
        otp_code=otp_code,
        is_verified="PENDING",
        expires_at=expires_at,
    )
    db.add(otp_record)
    db.commit()

    # Send OTP via SMS (simulated)
    send_otp_to_phone(user.phone_number, otp_code)

    return {
        "message": f"OTP sent to {user.phone_number}",
        "phone_number": user.phone_number,
        "expires_in_minutes": 5,
    }
