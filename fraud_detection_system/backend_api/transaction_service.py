from datetime import datetime, timedelta
from decimal import Decimal
from statistics import median

from fastapi import HTTPException
from sqlalchemy import desc, func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ml_services import FraudDetectionService
from models import Account, AdminReview, Alert, FraudPrediction, Transaction, User
from schemas import AdminReviewRequest, CreateTransactionRequest, TransactionDecisionResponse, TransactionRequest


def normalize_risk_level(score: float) -> str:
    if score >= 90:
        return "CRITICAL"
    if score >= 75:
        return "HIGH"
    if score >= 40:
        return "MEDIUM"
    return "LOW"


def _money(value) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"))


def _get_account_for_update(db: Session, account_id: int | None) -> Account | None:
    if account_id is None:
        return None
    return (
        db.query(Account)
        .filter(Account.id == account_id)
        .with_for_update()
        .one_or_none()
    )


def _build_history_features(
    db: Session,
    from_account: Account | None,
    to_account: Account | None,
    amount: Decimal,
) -> dict:
    if from_account is None:
        return {
            "avg_amount_last_10": 0.0,
            "max_amount_last_10": 0.0,
            "median_amount_last_10": 0.0,
            "amount_ratio_to_avg": 0.0,
            "amount_to_balance_ratio": 0.0,
            "balance_after_transaction": 0.0,
            "transaction_count_24h": 0,
            "is_new_receiver": False,
            "user_account_age_days": 0,
        }

    recent_transactions = (
        db.query(Transaction)
        .filter(
            Transaction.from_account_id == from_account.id,
            Transaction.status == "COMPLETED",
        )
        .order_by(desc(Transaction.created_at))
        .limit(10)
        .all()
    )
    amounts = [float(tx.amount) for tx in recent_transactions]
    avg_amount = sum(amounts) / len(amounts) if amounts else 0.0
    max_amount = max(amounts) if amounts else 0.0
    median_amount = float(median(amounts)) if amounts else 0.0
    amount_float = float(amount)
    balance_float = float(from_account.balance)
    amount_to_balance_ratio = amount_float / balance_float if balance_float > 0 else 0.0

    tx_24h = (
        db.query(Transaction)
        .filter(
            Transaction.from_account_id == from_account.id,
            Transaction.created_at >= datetime.utcnow() - timedelta(hours=24),
        )
        .count()
    )

    seen_receiver = False
    if to_account is not None:
        seen_receiver = (
            db.query(Transaction)
            .filter(
                Transaction.from_account_id == from_account.id,
                Transaction.to_account_id == to_account.id,
                Transaction.status == "COMPLETED",
            )
            .first()
            is not None
        )

    return {
        "avg_amount_last_10": round(avg_amount, 2),
        "max_amount_last_10": round(max_amount, 2),
        "median_amount_last_10": round(median_amount, 2),
        "amount_ratio_to_avg": round(amount_float / avg_amount, 2) if avg_amount > 0 else 0.0,
        "amount_to_balance_ratio": round(amount_to_balance_ratio, 4),
        "balance_after_transaction": round(balance_float - amount_float, 2),
        "transaction_count_24h": tx_24h,
        "is_new_receiver": to_account is not None and not seen_receiver,
        "user_account_age_days": (datetime.utcnow() - from_account.created_at).days,
    }


def _apply_history_rules(
    base_score: float,
    features: dict,
    explanations: list[str],
    tx_type: str,
) -> float:
    score = float(base_score)
    ratio = features["amount_ratio_to_avg"]
    balance_ratio = features.get("amount_to_balance_ratio", 0.0)
    amount = features.get("requested_amount", 0.0)
    transfer_like = tx_type in {"TRANSFER", "CASH_OUT", "PAYMENT"}

    if ratio >= 20:
        score += 20
        explanations.append("Amount is at least 20x higher than the account's recent average.")
    elif ratio >= 10:
        score += 12
        explanations.append("Amount is at least 10x higher than the account's recent average.")
    elif ratio >= 5:
        score += 6
        explanations.append("Amount is at least 5x higher than the account's recent average.")

    if features["transaction_count_24h"] >= 10:
        score += 12
        explanations.append("The account has unusually high transaction volume in the last 24 hours.")
    elif features["transaction_count_24h"] >= 5:
        score += 8
        explanations.append("The account has several transactions in the last 24 hours.")

    if features["is_new_receiver"]:
        score += 5
        explanations.append("Receiver has no completed transfer history with this account.")

    if transfer_like and amount >= 200_000 and balance_ratio >= 0.95:
        score = max(score, 85.0)
        explanations.append("Transaction would drain almost the entire source account balance.")
    elif transfer_like and amount >= 200_000 and balance_ratio >= 0.75:
        score = max(score, 70.0)
        explanations.append("Transaction uses a very large share of the source account balance.")

    if tx_type == "TRANSFER" and features["is_new_receiver"] and amount >= 500_000:
        score = max(score, 80.0)
        explanations.append("Large transfer to a new receiver requires admin review before funds move.")

    return round(min(score, 100.0), 2)


def _build_response(tx: Transaction, prediction: FraudPrediction) -> TransactionDecisionResponse:
    if tx.status == "COMPLETED":
        next_action = "NONE"
    elif tx.status == "PENDING":
        next_action = "OTP_REQUIRED"
    elif prediction.risk_level == "CRITICAL":
        next_action = "ACCOUNT_FROZEN_ADMIN_REVIEW"
    else:
        next_action = "ADMIN_REVIEW"

    return TransactionDecisionResponse(
        transaction_id=tx.id,
        status=tx.status,
        risk_score=prediction.risk_score,
        risk_level=prediction.risk_level,
        next_action=next_action,
        explanations=prediction.explanations,
    )


def _serialize_transaction(tx: Transaction) -> dict:
    prediction = tx.fraud_prediction
    from_user = tx.from_account.user if tx.from_account is not None else None
    to_user = tx.to_account.user if tx.to_account is not None else None

    return {
        "id": tx.id,
        "request_id": tx.request_id,
        "from_account_id": tx.from_account_id,
        "from_username": from_user.username if from_user is not None else None,
        "from_full_name": from_user.full_name if from_user is not None else None,
        "to_account_id": tx.to_account_id,
        "to_username": to_user.username if to_user is not None else None,
        "to_full_name": to_user.full_name if to_user is not None else None,
        "amount": float(tx.amount),
        "type": tx.type,
        "note": tx.note,
        "device_ip": tx.device_ip,
        "status": tx.status,
        "risk_score": prediction.risk_score if prediction is not None else None,
        "risk_level": prediction.risk_level if prediction is not None else None,
        "review_status": prediction.review_status if prediction is not None else None,
        "explanations": prediction.explanations if prediction is not None else [],
        "features_snapshot": prediction.features_snapshot if prediction is not None else None,
        "created_at": tx.created_at.isoformat(),
        "updated_at": tx.updated_at.isoformat(),
    }


def _create_alert_for_prediction(
    db: Session,
    tx: Transaction,
    prediction: FraudPrediction,
    from_acc: Account | None,
    to_acc: Account | None,
) -> None:
    if prediction.risk_level not in {"HIGH", "CRITICAL"}:
        return

    alert_user_id = from_acc.user_id if from_acc is not None else to_acc.user_id if to_acc is not None else None
    action_text = "Account was frozen and admin review is required." if prediction.risk_level == "CRITICAL" else "Transaction was blocked and is waiting for admin review."
    title = f"{prediction.risk_level} risk transaction blocked"
    ip_text = tx.device_ip or "unknown IP"
    from_user = from_acc.user if from_acc is not None else None
    to_user = to_acc.user if to_acc is not None else None
    sender_text = from_user.username if from_user is not None else "external"
    receiver_text = to_user.username if to_user is not None else "external"
    message = (
        f"{tx.type} transaction #{tx.id} for {float(tx.amount):,.0f} VND "
        f"from @{sender_text} to @{receiver_text} was scored {prediction.risk_score:.2f}/100 "
        f"from {ip_text}. {action_text}"
    )

    db.add(
        Alert(
            user_id=alert_user_id,
            transaction_id=tx.id,
            prediction_id=prediction.id,
            type="FRAUD_ALERT",
            risk_level=prediction.risk_level,
            title=title,
            message=message,
            status="UNREAD",
        )
    )


def _validate_request_accounts(
    req: CreateTransactionRequest,
    from_acc: Account | None,
    to_acc: Account | None,
) -> None:
    if req.type in {"TRANSFER", "CASH_OUT", "PAYMENT"} and from_acc is None:
        raise HTTPException(status_code=400, detail="from_account_id is required")

    if req.type in {"TRANSFER", "CASH_IN", "PAYMENT"} and to_acc is None:
        raise HTTPException(status_code=400, detail="to_account_id is required")

    if from_acc is not None and to_acc is not None and from_acc.id == to_acc.id:
        raise HTTPException(status_code=400, detail="from_account_id and to_account_id must be different")

    if from_acc is not None and from_acc.status != "ACTIVE":
        raise HTTPException(status_code=400, detail="Source account is not active")

    if to_acc is not None and to_acc.status != "ACTIVE":
        raise HTTPException(status_code=400, detail="Destination account is not active")


def create_transaction(
    db: Session,
    req: CreateTransactionRequest,
    current_user: User | None = None,
) -> TransactionDecisionResponse:
    existing = db.query(Transaction).filter(Transaction.request_id == req.request_id).one_or_none()
    if existing is not None and existing.fraud_prediction is not None:
        return _build_response(existing, existing.fraud_prediction)

    amount = _money(req.amount)
    from_acc = _get_account_for_update(db, req.from_account_id)
    to_acc = _get_account_for_update(db, req.to_account_id)

    _validate_request_accounts(req, from_acc, to_acc)

    if current_user is not None and current_user.role != "ADMIN":
        if from_acc is not None and from_acc.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Source account does not belong to current user")
        if req.type == "CASH_IN" and to_acc is not None and to_acc.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Destination account does not belong to current user")

    if from_acc is not None and from_acc.balance < amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")

    old_org = from_acc.balance if from_acc is not None else Decimal("0.00")
    old_dest = to_acc.balance if to_acc is not None else Decimal("0.00")
    new_org = old_org - amount if from_acc is not None else Decimal("0.00")
    new_dest = old_dest + amount if to_acc is not None else Decimal("0.00")

    model_input = TransactionRequest(
        step=1,
        type=req.type,
        amount=float(amount),
        oldbalanceOrg=float(old_org),
        newbalanceOrig=float(new_org),
        oldbalanceDest=float(old_dest),
        newbalanceDest=float(new_dest),
    )
    ml_result = FraudDetectionService().predict(model_input)

    features_snapshot = {
        **_build_history_features(db, from_acc, to_acc, amount),
        "requested_amount": float(amount),
    }
    explanations = list(ml_result.explanations)
    final_score = _apply_history_rules(ml_result.risk_score, features_snapshot, explanations, req.type)
    risk_level = normalize_risk_level(final_score)

    tx = Transaction(
        request_id=req.request_id,
        from_account_id=req.from_account_id,
        to_account_id=req.to_account_id,
        amount=amount,
        type=req.type,
        note=req.note,
        device_ip=req.device_ip,
        status="PROCESSING",
    )
    db.add(tx)
    db.flush()

    prediction = FraudPrediction(
        transaction_id=tx.id,
        risk_score=final_score,
        risk_level=risk_level,
        explanations=explanations,
        features_snapshot={
            **features_snapshot,
            "oldbalanceOrg": float(old_org),
            "newbalanceOrig": float(new_org),
            "oldbalanceDest": float(old_dest),
            "newbalanceDest": float(new_dest),
            "errorBalanceOrig": float(new_org + amount - old_org),
            "errorBalanceDest": float(old_dest + amount - new_dest),
        },
    )
    db.add(prediction)

    if risk_level == "LOW":
        tx.status = "COMPLETED"
        if from_acc is not None:
            from_acc.balance = new_org
        if to_acc is not None:
            to_acc.balance = new_dest
    elif risk_level == "MEDIUM":
        tx.status = "PENDING"
    else:
        tx.status = "BLOCKED"
        if risk_level == "CRITICAL" and from_acc is not None:
            from_acc.status = "FROZEN"

    db.flush()
    _create_alert_for_prediction(db, tx, prediction, from_acc, to_acc)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = db.query(Transaction).filter(Transaction.request_id == req.request_id).one_or_none()
        if existing is not None and existing.fraud_prediction is not None:
            return _build_response(existing, existing.fraud_prediction)
        raise

    db.refresh(tx)
    db.refresh(prediction)
    return _build_response(tx, prediction)


def verify_pending_transaction(
    db: Session,
    transaction_id: int,
    phone_number: str,
    otp_code: str,
    current_user: User | None = None,
) -> TransactionDecisionResponse:
    from otp_service import verify_transaction_otp

    tx = (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id)
        .with_for_update()
        .one_or_none()
    )
    if tx is None:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if tx.status != "PENDING":
        raise HTTPException(status_code=400, detail=f"Transaction is {tx.status}, not PENDING")

    from_acc = _get_account_for_update(db, tx.from_account_id)
    to_acc = _get_account_for_update(db, tx.to_account_id)
    amount = _money(tx.amount)

    if current_user is not None and current_user.role != "ADMIN":
        if from_acc is None or from_acc.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Transaction does not belong to current user")

    # Verify phone number and OTP
    if current_user is not None:
        verify_transaction_otp(db, current_user.id, phone_number, otp_code)

    if from_acc is not None and from_acc.status != "ACTIVE":
        tx.status = "FAILED"
        db.commit()
        raise HTTPException(status_code=400, detail="Source account is not active")

    if from_acc is not None and from_acc.balance < amount:
        tx.status = "FAILED"
        db.commit()
        raise HTTPException(status_code=400, detail="Insufficient balance after OTP verification")

    if from_acc is not None:
        from_acc.balance = from_acc.balance - amount
    if to_acc is not None:
        to_acc.balance = to_acc.balance + amount

    tx.status = "COMPLETED"
    db.commit()
    db.refresh(tx)
    return _build_response(tx, tx.fraud_prediction)


def get_high_risk_predictions(db: Session) -> list[dict]:
    rows = (
        db.query(FraudPrediction)
        .join(Transaction)
        .filter(
            FraudPrediction.risk_level.in_(["HIGH", "CRITICAL"]),
            FraudPrediction.review_status == "PENDING",
        )
        .order_by(desc(FraudPrediction.created_at))
        .all()
    )

    return [
        {
            "prediction_id": row.id,
            "transaction_id": row.transaction_id,
            "request_id": row.transaction.request_id,
            "from_account_id": row.transaction.from_account_id,
            "from_username": row.transaction.from_account.user.username if row.transaction.from_account is not None else None,
            "from_full_name": row.transaction.from_account.user.full_name if row.transaction.from_account is not None else None,
            "to_account_id": row.transaction.to_account_id,
            "to_username": row.transaction.to_account.user.username if row.transaction.to_account is not None else None,
            "to_full_name": row.transaction.to_account.user.full_name if row.transaction.to_account is not None else None,
            "device_ip": row.transaction.device_ip,
            "amount": float(row.transaction.amount),
            "type": row.transaction.type,
            "status": row.transaction.status,
            "risk_score": row.risk_score,
            "risk_level": row.risk_level,
            "review_status": row.review_status,
            "explanations": row.explanations,
            "features_snapshot": row.features_snapshot,
            "created_at": row.created_at.isoformat(),
        }
        for row in rows
    ]


def get_admin_alerts(db: Session) -> list[dict]:
    rows = (
        db.query(Alert)
        .join(Transaction, Alert.transaction_id == Transaction.id)
        .join(FraudPrediction, Alert.prediction_id == FraudPrediction.id)
        .filter(
            FraudPrediction.risk_level.in_(["HIGH", "CRITICAL"]),
            FraudPrediction.review_status == "PENDING",
        )
        .order_by(desc(Alert.created_at))
        .all()
    )

    result = []
    for alert in rows:
        username = alert.user.username if alert.user is not None else None
        tx = alert.transaction
        from_user = tx.from_account.user if tx.from_account is not None else None
        to_user = tx.to_account.user if tx.to_account is not None else None
        result.append(
            {
                "id": alert.id,
                "user_id": alert.user_id,
                "username": username,
                "transaction_id": alert.transaction_id,
                "prediction_id": alert.prediction_id,
                "request_id": tx.request_id,
                "from_account_id": tx.from_account_id,
                "from_username": from_user.username if from_user is not None else None,
                "from_full_name": from_user.full_name if from_user is not None else None,
                "to_account_id": tx.to_account_id,
                "to_username": to_user.username if to_user is not None else None,
                "to_full_name": to_user.full_name if to_user is not None else None,
                "device_ip": tx.device_ip,
                "type": alert.type,
                "risk_level": alert.risk_level,
                "risk_score": alert.prediction.risk_score,
                "title": alert.title,
                "message": alert.message,
                "status": alert.status,
                "amount": float(tx.amount),
                "transaction_type": tx.type,
                "transaction_status": tx.status,
                "review_status": alert.prediction.review_status,
                "explanations": alert.prediction.explanations,
                "features_snapshot": alert.prediction.features_snapshot,
                "created_at": alert.created_at.isoformat(),
            }
        )

    return result


def list_admin_transactions(db: Session, limit: int = 200) -> list[dict]:
    rows = (
        db.query(Transaction)
        .order_by(desc(Transaction.created_at))
        .limit(limit)
        .all()
    )
    return [_serialize_transaction(row) for row in rows]


def list_user_transactions(db: Session, user: User, limit: int = 100) -> list[dict]:
    account_ids = [
        row[0]
        for row in db.query(Account.id).filter(Account.user_id == user.id).all()
    ]
    if not account_ids:
        return []

    rows = (
        db.query(Transaction)
        .filter(
            or_(
                Transaction.from_account_id.in_(account_ids),
                Transaction.to_account_id.in_(account_ids),
            )
        )
        .order_by(desc(Transaction.created_at))
        .limit(limit)
        .all()
    )
    return [_serialize_transaction(row) for row in rows]


def get_admin_dashboard_summary(db: Session) -> dict:
    since = datetime.utcnow() - timedelta(hours=24)
    return {
        "total_users": db.query(User).count(),
        "transactions_24h": db.query(Transaction).filter(Transaction.created_at >= since).count(),
        "high_risk_alerts": (
            db.query(Alert)
            .join(FraudPrediction, Alert.prediction_id == FraudPrediction.id)
            .filter(
                Alert.risk_level.in_(["HIGH", "CRITICAL"]),
                FraudPrediction.review_status == "PENDING",
            )
            .count()
        ),
        "blocked_transactions": db.query(Transaction).filter(Transaction.status == "BLOCKED").count(),
        "pending_reviews": (
            db.query(FraudPrediction)
            .filter(
                FraudPrediction.risk_level.in_(["HIGH", "CRITICAL"]),
                FraudPrediction.review_status == "PENDING",
            )
            .count()
        ),
    }


def _settle_transaction(
    tx: Transaction,
    from_acc: Account | None,
    to_acc: Account | None,
) -> None:
    if tx.status == "COMPLETED":
        return

    amount = _money(tx.amount)
    if from_acc is not None and from_acc.status == "FROZEN":
        from_acc.status = "ACTIVE"

    if from_acc is not None and from_acc.status != "ACTIVE":
        raise HTTPException(status_code=400, detail="Source account is not active")
    if to_acc is not None and to_acc.status != "ACTIVE":
        raise HTTPException(status_code=400, detail="Destination account is not active")
    if from_acc is not None and from_acc.balance < amount:
        raise HTTPException(status_code=400, detail="Insufficient balance to approve transaction")

    if from_acc is not None:
        from_acc.balance = from_acc.balance - amount
    if to_acc is not None:
        to_acc.balance = to_acc.balance + amount

    tx.status = "COMPLETED"


def review_fraud_prediction(
    db: Session,
    prediction_id: int,
    req: AdminReviewRequest,
    admin: User,
) -> dict:
    prediction = (
        db.query(FraudPrediction)
        .filter(FraudPrediction.id == prediction_id)
        .with_for_update()
        .one_or_none()
    )
    if prediction is None:
        raise HTTPException(status_code=404, detail="Fraud prediction not found")

    tx = (
        db.query(Transaction)
        .filter(Transaction.id == prediction.transaction_id)
        .with_for_update()
        .one_or_none()
    )
    if tx is None:
        raise HTTPException(status_code=404, detail="Transaction not found")

    from_acc = _get_account_for_update(db, tx.from_account_id)
    to_acc = _get_account_for_update(db, tx.to_account_id)
    action = req.action_taken

    if action == "APPROVE":
        if tx.status == "FAILED":
            raise HTTPException(status_code=400, detail="Failed transactions cannot be approved")
        _settle_transaction(tx, from_acc, to_acc)
        prediction.review_status = "APPROVED"
        message = "Transaction approved and settled."
    elif action == "REJECT":
        if tx.status == "COMPLETED":
            raise HTTPException(status_code=400, detail="Completed transactions cannot be rejected")
        tx.status = "FAILED"
        prediction.review_status = "REJECTED"
        message = "Transaction rejected."
    elif action == "ACCOUNT_FROZEN":
        if from_acc is None:
            raise HTTPException(status_code=400, detail="No source account to freeze")
        from_acc.status = "FROZEN"
        if tx.status != "COMPLETED":
            tx.status = "BLOCKED"
        prediction.review_status = "ACCOUNT_FROZEN"
        message = "Source account frozen."
    elif action == "USER_BANNED":
        if from_acc is None or from_acc.user is None:
            raise HTTPException(status_code=400, detail="No source user to ban")
        from_acc.user.status = "BANNED"
        from_acc.status = "FROZEN"
        if tx.status != "COMPLETED":
            tx.status = "BLOCKED"
        prediction.review_status = "USER_BANNED"
        message = "Source user banned and account frozen."
    else:
        prediction.review_status = "FALSE_POSITIVE"
        message = "Prediction marked as false positive."

    prediction.reviewed_by = admin.id
    prediction.review_note = req.review_notes
    db.add(
        AdminReview(
            prediction_id=prediction.id,
            admin_id=admin.id,
            action_taken=action,
            review_notes=req.review_notes,
        )
    )

    related_alerts = db.query(Alert).filter(Alert.prediction_id == prediction.id).all()
    for alert in related_alerts:
        alert.status = "READ"

    db.commit()
    db.refresh(tx)
    db.refresh(prediction)

    return {
        "prediction_id": prediction.id,
        "transaction_id": tx.id,
        "action_taken": action,
        "review_status": prediction.review_status,
        "message": message,
        "transaction": _serialize_transaction(tx),
    }


def mark_alert_read(db: Session, alert_id: int) -> dict:
    alert = db.query(Alert).filter(Alert.id == alert_id).one_or_none()
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.status = "READ"
    db.commit()
    db.refresh(alert)
    return {"id": alert.id, "status": alert.status}
