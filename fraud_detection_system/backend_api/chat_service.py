from __future__ import annotations

import json
import os
from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path
import re
import unicodedata
import urllib.error
import urllib.request

from sqlalchemy import desc, or_
from sqlalchemy.orm import Session

from models import Account, ChatMessage, Transaction, User
from transaction_service import _serialize_transaction


_IN_SCOPE_KEYWORDS = {
    "account",
    "balance",
    "blocked",
    "canh bao",
    "cash in",
    "cash out",
    "completed",
    "fraud",
    "giao dich",
    "lich su",
    "nhan",
    "otp",
    "payment",
    "pending",
    "risk",
    "so du",
    "tai khoan",
    "thanh toan",
    "transaction",
    "transfer",
    "trang thai",
    "chuyen",
    "gui",
    "nguoi nhan",
    "nguoi gui",
}

_VAGUE_PATTERNS = {
    "cai do",
    "cai kia",
    "cai nay",
    "do",
    "hihi",
    "hello",
    "hey",
    "hi",
    "ok",
    "roi sao",
    "sao nua",
    "the con",
    "xin chao",
}

_GREETING_PATTERNS = {
    "hello",
    "hey",
    "hi",
    "xin chao",
}

_TYPE_KEYWORDS = {
    "TRANSFER": ("transfer", "chuyen"),
    "CASH_IN": ("cash in", "nap", "nop tien", "nhan tien vao"),
    "CASH_OUT": ("cash out", "rut", "rut tien"),
    "PAYMENT": ("payment", "thanh toan"),
}

_OUT_OF_SCOPE_ANSWER = (
    "Toi chi ho tro thong tin tai khoan, so du, trang thai, canh bao va lich su giao dich "
    "cua chinh ban. Toi se khong tra loi du lieu cua nguoi khac hay chu de ngoai pham vi nay."
)


def _normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())


def _strip_accents(text: str) -> str:
    normalized = unicodedata.normalize("NFD", text or "")
    return "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")


def _normalized_no_accents(text: str) -> str:
    return _normalize_text(_strip_accents(text))


def _format_money(value: float | Decimal | int | None) -> str:
    amount = float(value or 0)
    return f"{amount:,.0f} VND".replace(",", ".")


def _format_dt(value: str | datetime | None) -> str:
    if value is None:
        return "khong ro thoi gian"
    if isinstance(value, str):
        dt = datetime.fromisoformat(value)
    else:
        dt = value
    return dt.strftime("%H:%M %d/%m/%Y")


def _is_vague_question(question: str) -> bool:
    normalized = _normalized_no_accents(question)
    if not normalized:
        return True
    if normalized in _VAGUE_PATTERNS:
        return True
    if len(normalized) <= 3:
        return True
    words = set(re.findall(r"\w+", normalized))
    return bool(words) and words.issubset({"do", "kia", "nay", "this", "that", "it"})


def _is_in_scope(question: str) -> bool:
    normalized = _normalized_no_accents(question)
    if not normalized:
        return False
    if any(keyword in normalized for keyword in _IN_SCOPE_KEYWORDS):
        return True
    return bool(re.search(r"(giao dich|transaction|tai khoan|so du|balance|otp|risk|fraud|\d)", normalized))


def _is_greeting_question(question: str) -> bool:
    normalized = _normalized_no_accents(question)
    if normalized in _GREETING_PATTERNS:
        return True

    words = set(re.findall(r"\w+", normalized))
    greeting_words = {"hello", "hey", "hi", "xin", "chao"}
    filler_words = {"a", "ban", "bot", "em", "minh", "nhe", "oi", "toi"}
    if words and words.issubset(greeting_words.union(filler_words)):
        return bool(words.intersection(greeting_words))

    return any(
        re.search(rf"\b{re.escape(pattern)}\b", normalized)
        for pattern in _GREETING_PATTERNS
        if pattern != "hi"
    )


def _extract_transaction_ids(text: str) -> list[int]:
    normalized = _normalized_no_accents(text)
    matches = re.findall(r"(?:giao dich|transaction|tx|#)\s*(\d+)", normalized)
    return [int(item) for item in matches]


def _parse_amount_tokens(text: str) -> list[float]:
    normalized = _normalized_no_accents(text)
    amounts: list[float] = []
    for raw_value, raw_unit in re.findall(r"(\d+(?:[.,]\d+)?)\s*(ty|trieu|tr|k|nghin|ngan)?", normalized):
        try:
            value = float(raw_value.replace(",", "."))
        except ValueError:
            continue
        unit = raw_unit or ""
        if unit == "ty":
            value *= 1_000_000_000
        elif unit in {"trieu", "tr"}:
            value *= 1_000_000
        elif unit in {"k", "nghin", "ngan"}:
            value *= 1_000
        amounts.append(value)
    return amounts


def _direction_for_query(question: str) -> str | None:
    normalized = _normalized_no_accents(question)
    if any(token in normalized for token in ("da chuyen", "gui", "chuyen cho", "toi chuyen")):
        return "outgoing"
    if any(token in normalized for token in ("nhan", "duoc chuyen", "ai gui", "tu ai")):
        return "incoming"
    return None


def _status_filter_for_query(question: str) -> str | None:
    normalized = _normalized_no_accents(question)
    if any(token in normalized for token in ("pending", "cho xu ly", "cho duyet", "otp")):
        return "PENDING"
    if any(token in normalized for token in ("blocked", "bi chan", "khoa")):
        return "BLOCKED"
    if any(token in normalized for token in ("completed", "hoan tat", "thanh cong")):
        return "COMPLETED"
    if any(token in normalized for token in ("failed", "that bai")):
        return "FAILED"
    return None


def _type_filter_for_query(question: str) -> str | None:
    normalized = _normalized_no_accents(question)
    for tx_type, hints in _TYPE_KEYWORDS.items():
        if any(hint in normalized for hint in hints):
            return tx_type
    return None


def _time_filter_name(question: str) -> str | None:
    normalized = _normalized_no_accents(question)
    if "hom nay" in normalized:
        return "today"
    if "24h" in normalized or "24 gio" in normalized:
        return "24h"
    if "thang nay" in normalized:
        return "month"
    return None


def _wants_balance(question: str) -> bool:
    normalized = _normalized_no_accents(question)
    return any(token in normalized for token in ("so du", "balance", "tai khoan con bao nhieu"))


def _wants_full_info(question: str) -> bool:
    normalized = _normalized_no_accents(question)
    return any(
        token in normalized
        for token in ("day du", "full thong tin", "toan bo thong tin", "tong quan tai khoan", "tong quan")
    )


def _wants_total(question: str) -> bool:
    normalized = _normalized_no_accents(question)
    return any(token in normalized for token in ("tong", "bao nhieu tien", "tong tien", "tong gia tri"))


def _wants_risk(question: str) -> bool:
    normalized = _normalized_no_accents(question)
    return any(token in normalized for token in ("risk", "fraud", "nguy co", "canh bao", "blocked", "otp", "pending"))


def _wants_recent_history(question: str) -> bool:
    normalized = _normalized_no_accents(question)
    return any(token in normalized for token in ("gan nhat", "moi nhat", "recent", "lich su giao dich", "5 giao dich"))


def _friendly_greeting_answer() -> str:
    return (
        "Chao ban. Minh co the giup xem so du, lich su giao dich, giao dich pending/blocked "
        "va canh bao cua chinh ban."
    )


def _friendly_clarify_answer() -> str:
    return (
        "Minh chua ro ban muon xem thong tin nao. Ban co the hoi ro hon, vi du: so du hien tai, "
        "5 giao dich gan nhat, giao dich pending, blocked, hoac giao dich voi so tien cu the."
    )


def _friendly_out_of_scope_answer() -> str:
    return (
        "Minh chi tra cuu du lieu tai khoan va giao dich cua chinh ban trong he thong nay. "
        "Minh khong the xem du lieu nguoi khac hay chu de ngoai pham vi do."
    )


def _friendly_no_account_answer() -> str:
    return "Ban chua co tai khoan nao duoc gan trong he thong."


def _friendly_no_match_answer() -> str:
    return "Minh chua tim thay giao dich nao cua chinh ban khop voi cau hoi nay."


def _friendly_balance_answer(profile: dict) -> str:
    balances = profile.get("balances") or []
    if not balances:
        return "Minh chua thay so du nao trong du lieu hien tai cua ban."

    total_balance = sum(float(item.get("balance") or 0) for item in balances)
    if len(balances) == 1:
        item = balances[0]
        return (
            f"So du hien tai cua ban la {_format_money(item.get('balance'))} "
            f"trong tai khoan #{item.get('account_id')} ({str(item.get('status') or '').lower()})."
        )

    lines = [
        f"- Tai khoan #{item['account_id']}: {_format_money(item['balance'])} ({str(item.get('status') or '').lower()})"
        for item in balances
    ]
    return (
        f"Tong so du hien tai cua ban la {_format_money(total_balance)}. "
        f"Ban dang co {len(balances)} tai khoan:\n" + "\n".join(lines)
    )


def _friendly_history_answer(transactions: list[dict], account_id_set: set[int], limit: int) -> str:
    if not transactions:
        return "Minh chua tim thay giao dich nao cua ban trong du lieu hien tai."

    lines = [_tx_line(tx, account_id_set) for tx in transactions[:limit]]
    header = f"Day la {min(len(transactions), limit)} giao dich gan nhat cua ban:"
    return header + "\n" + "\n".join(f"- {line}" for line in lines)


def _load_recent_chat_messages(db: Session, user_id: int, limit: int = 12) -> list[ChatMessage]:
    rows = (
        db.query(ChatMessage)
        .filter(ChatMessage.user_id == user_id)
        .order_by(desc(ChatMessage.created_at))
        .limit(limit)
        .all()
    )
    return list(reversed(rows))


def _save_chat_message(
    db: Session,
    user_id: int,
    role: str,
    content: str,
    context: dict | None = None,
) -> None:
    db.add(
        ChatMessage(
            user_id=user_id,
            role=role,
            content=content,
            context=context,
        )
    )
    db.commit()


def _collect_user_accounts(db: Session, user: User) -> list[Account]:
    return db.query(Account).filter(Account.user_id == user.id).order_by(Account.id).all()


def _collect_user_transactions(db: Session, account_ids: list[int], limit: int | None = 1000) -> list[dict]:
    if not account_ids:
        return []
    query = (
        db.query(Transaction)
        .filter(
            or_(
                Transaction.from_account_id.in_(account_ids),
                Transaction.to_account_id.in_(account_ids),
            )
        )
        .order_by(desc(Transaction.created_at))
    )
    if limit is not None and limit > 0:
        query = query.limit(limit)
    rows = query.all()
    return [_serialize_transaction(row) for row in rows]


def _build_profile_summary(
    db: Session,
    user: User,
    accounts: list[Account],
    account_ids: list[int],
) -> dict:
    if not account_ids:
        return {
            "account_count": 0,
            "balances": [],
            "transaction_count": 0,
            "pending_count": 0,
            "blocked_count": 0,
            "completed_count": 0,
            "last_transaction_at": None,
        }

    base_filter = or_(
        Transaction.from_account_id.in_(account_ids),
        Transaction.to_account_id.in_(account_ids),
    )

    transaction_count = db.query(Transaction).filter(base_filter).count()
    pending_count = db.query(Transaction).filter(base_filter, Transaction.status == "PENDING").count()
    blocked_count = db.query(Transaction).filter(base_filter, Transaction.status == "BLOCKED").count()
    completed_count = db.query(Transaction).filter(base_filter, Transaction.status == "COMPLETED").count()
    last_tx = (
        db.query(Transaction.created_at)
        .filter(base_filter)
        .order_by(desc(Transaction.created_at))
        .first()
    )

    return {
        "username": user.username,
        "full_name": user.full_name,
        "phone_number": user.phone_number,
        "status": user.status,
        "account_count": len(accounts),
        "balances": [
            {
                "account_id": account.id,
                "balance": float(account.balance),
                "currency": account.currency,
                "status": account.status,
            }
            for account in accounts
        ],
        "transaction_count": transaction_count,
        "pending_count": pending_count,
        "blocked_count": blocked_count,
        "completed_count": completed_count,
        "last_transaction_at": last_tx[0].isoformat() if last_tx else None,
    }


def _tx_direction(tx: dict, account_ids: set[int]) -> str:
    from_match = tx.get("from_account_id") in account_ids if tx.get("from_account_id") is not None else False
    to_match = tx.get("to_account_id") in account_ids if tx.get("to_account_id") is not None else False
    if from_match and to_match:
        return "internal"
    if from_match:
        return "outgoing"
    if to_match:
        return "incoming"
    return "related"


def _tx_counterparty(tx: dict, account_ids: set[int]) -> str:
    direction = _tx_direction(tx, account_ids)
    if direction == "outgoing":
        return tx.get("to_username") or tx.get("to_full_name") or f"tai khoan {tx.get('to_account_id')}"
    if direction == "incoming":
        return tx.get("from_username") or tx.get("from_full_name") or f"tai khoan {tx.get('from_account_id')}"
    if direction == "internal":
        return "giua cac tai khoan cua ban"
    return "khong ro doi ung"


def _tx_line(tx: dict, account_ids: set[int]) -> str:
    direction = _tx_direction(tx, account_ids)
    counterparty = _tx_counterparty(tx, account_ids)
    when_text = _format_dt(tx.get("created_at"))
    amount_text = _format_money(tx.get("amount"))
    status_text = str(tx.get("status") or "").lower()
    type_text = str(tx.get("type") or "").lower()

    if direction == "outgoing":
        action_text = f"ban chuyen {amount_text} cho {counterparty}"
    elif direction == "incoming":
        action_text = f"ban nhan {amount_text} tu {counterparty}"
    elif direction == "internal":
        action_text = f"ban di chuyen noi bo {amount_text}"
    else:
        action_text = f"giao dich {amount_text}"

    note_text = f", ghi chu: {tx['note']}" if tx.get("note") else ""
    risk_text = ""
    if tx.get("risk_level"):
        risk_text = f", risk {str(tx['risk_level']).lower()} ({float(tx.get('risk_score') or 0):.0f}/100)"

    return (
        f"#{tx['id']} luc {when_text}: {action_text}, loai {type_text}, "
        f"trang thai {status_text}{risk_text}{note_text}"
    )


def _matches_time_filter(tx: dict, filter_name: str | None) -> bool:
    if filter_name is None:
        return True
    created_at = datetime.fromisoformat(tx["created_at"])
    now = datetime.utcnow()
    if filter_name == "today":
        return created_at.date() == now.date()
    if filter_name == "24h":
        return created_at >= now - timedelta(hours=24)
    if filter_name == "month":
        return created_at.year == now.year and created_at.month == now.month
    return True


def _score_transaction(
    tx: dict,
    question: str,
    account_ids: set[int],
    preferred_tx_ids: set[int],
) -> float:
    normalized = _normalized_no_accents(question)
    question_tokens = set(re.findall(r"\w+", normalized))
    tx_line = _normalized_no_accents(_tx_line(tx, account_ids))
    tx_tokens = set(re.findall(r"\w+", tx_line))
    score = float(len(question_tokens.intersection(tx_tokens)))

    if tx.get("id") in preferred_tx_ids:
        score += 40
    for tx_id in _extract_transaction_ids(question):
        if tx_id == tx.get("id"):
            score += 60

    tx_direction = _tx_direction(tx, account_ids)
    query_direction = _direction_for_query(question)
    if query_direction and tx_direction == query_direction:
        score += 12

    query_status = _status_filter_for_query(question)
    if query_status and tx.get("status") == query_status:
        score += 10

    query_type = _type_filter_for_query(question)
    if query_type and tx.get("type") == query_type:
        score += 10

    normalized_counterparty = _normalized_no_accents(_tx_counterparty(tx, account_ids))
    if normalized_counterparty and any(token in normalized_counterparty for token in question_tokens if len(token) >= 3):
        score += 8

    for amount in _parse_amount_tokens(question):
        tx_amount = float(tx.get("amount") or 0)
        tolerance = max(5_000.0, amount * 0.05)
        if abs(tx_amount - amount) <= tolerance:
            score += 18

    if _matches_time_filter(tx, _time_filter_name(question)):
        score += 6

    return score


def _select_relevant_transactions(
    transactions: list[dict],
    question: str,
    account_ids: set[int],
    preferred_tx_ids: set[int],
    limit: int = 5,
) -> list[dict]:
    query_direction = _direction_for_query(question)
    query_status = _status_filter_for_query(question)
    query_type = _type_filter_for_query(question)
    query_time = _time_filter_name(question)
    tx_id_filters = set(_extract_transaction_ids(question))
    amount_filters = _parse_amount_tokens(question)
    wants_recent = _wants_recent_history(question)

    if wants_recent and not any([query_direction, query_status, query_type, query_time, tx_id_filters]):
        recent_rows = []
        for index, tx in enumerate(transactions[:limit]):
            recent_rows.append({**tx, "_chat_score": float(limit - index)})
        return recent_rows

    filtered: list[dict] = []
    for tx in transactions:
        if query_direction and _tx_direction(tx, account_ids) != query_direction:
            continue
        if query_status and tx.get("status") != query_status:
            continue
        if query_type and tx.get("type") != query_type:
            continue
        if query_time and not _matches_time_filter(tx, query_time):
            continue
        if tx_id_filters and tx.get("id") not in tx_id_filters:
            continue
        if amount_filters:
            tx_amount = float(tx.get("amount") or 0)
            if not any(abs(tx_amount - amount) <= max(5_000.0, amount * 0.05) for amount in amount_filters):
                continue
        filtered.append(tx)

    candidates = filtered or transactions
    scored = []
    for tx in candidates:
        score = _score_transaction(tx, question, account_ids, preferred_tx_ids)
        if score > 0 or tx.get("id") in preferred_tx_ids:
            scored.append((score, tx))

    if not scored:
        scored = [(_score_transaction(tx, question, account_ids, preferred_tx_ids), tx) for tx in transactions[:limit]]

    scored.sort(key=lambda item: (item[0], item[1].get("created_at") or ""), reverse=True)
    result = []
    for score, tx in scored[:limit]:
        result.append({**tx, "_chat_score": round(score, 2)})
    return result


def _build_sources(transactions: list[dict], account_ids: set[int]) -> list[dict]:
    return [
        {
            "kind": "transaction",
            "transaction_id": tx.get("id"),
            "request_id": tx.get("request_id"),
            "snippet": _tx_line(tx, account_ids),
            "created_at": tx.get("created_at"),
            "score": tx.get("_chat_score"),
        }
        for tx in transactions
    ]


def _chat_rag_transaction_limit() -> int:
    try:
        limit = int(_read_env_value("CHAT_RAG_TRANSACTION_LIMIT", "0"))
    except ValueError:
        limit = 0
    return max(limit, 0)


def _chat_rag_dir() -> Path:
    configured = _read_env_value("CHAT_RAG_DIR", "")
    if configured:
        return Path(configured).expanduser()
    return Path(__file__).with_name("rag_store")


def _build_user_rag_document(
    user: User,
    profile: dict,
    accounts: list[Account],
    transactions: list[dict],
    account_ids: set[int],
) -> dict:
    generated_at = datetime.utcnow().isoformat()
    account_rows = [
        {
            "account_id": account.id,
            "balance": float(account.balance),
            "balance_text": _format_money(account.balance),
            "currency": account.currency,
            "status": account.status,
            "created_at": account.created_at.isoformat() if account.created_at else None,
            "updated_at": account.updated_at.isoformat() if account.updated_at else None,
        }
        for account in accounts
    ]
    transaction_rows = [
        {
            **tx,
            "id": tx.get("id"),
            "transaction_id": tx.get("id"),
            "request_id": tx.get("request_id"),
            "direction": _tx_direction(tx, account_ids),
            "counterparty": _tx_counterparty(tx, account_ids),
            "summary": _tx_line(tx, account_ids),
            "amount": float(tx.get("amount") or 0),
            "amount_text": _format_money(tx.get("amount")),
            "type": tx.get("type"),
            "status": tx.get("status"),
            "risk_level": tx.get("risk_level"),
            "risk_score": tx.get("risk_score"),
            "review_status": tx.get("review_status"),
            "note": tx.get("note"),
            "device_ip": tx.get("device_ip"),
            "created_at": tx.get("created_at"),
            "updated_at": tx.get("updated_at"),
            "explanations": tx.get("explanations") or [],
            "features_snapshot": tx.get("features_snapshot"),
        }
        for tx in transactions
    ]

    return {
        "document_id": f"user-{user.id}-transaction-rag",
        "document_type": "current_user_transaction_rag",
        "version": 1,
        "scope": "current_authenticated_user_only",
        "generated_at": generated_at,
        "user_id": user.id,
        "username": user.username,
        "full_name": user.full_name,
        "phone_number": user.phone_number,
        "profile_snapshot": profile,
        "profile_summary": _format_profile_context(profile),
        "accounts": account_rows,
        "account_count": profile.get("account_count", len(account_rows)),
        "transaction_count": profile.get("transaction_count", len(transaction_rows)),
        "included_transaction_count": len(transaction_rows),
        "transactions": transaction_rows,
        "policy": {
            "allowed_scope": "Only use this user snapshot.",
            "answer_language": "vi",
            "disallow": [
                "other users",
                "invented values",
                "out_of_scope_topics",
            ],
        },
    }


def _write_user_rag_document(rag_document: dict) -> dict:
    rag_dir = _chat_rag_dir()
    file_name = f"user_{rag_document['user_id']}_rag.json"
    rag_path = rag_dir / file_name
    rag_document["file_name"] = file_name
    rag_document["write_status"] = "written"
    try:
        rag_dir.mkdir(parents=True, exist_ok=True)
        rag_path.write_text(
            json.dumps(rag_document, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        return {
            "file_name": file_name,
            "write_status": "written",
        }
    except (OSError, TypeError, ValueError):
        rag_document["file_name"] = None
        rag_document["write_status"] = "failed"
        return {
            "file_name": None,
            "write_status": "failed",
        }


def build_user_chat_rag_snapshot(db: Session, user: User) -> dict:
    accounts = _collect_user_accounts(db, user)
    account_ids = [account.id for account in accounts]
    account_id_set = set(account_ids)
    profile = _build_profile_summary(db, user, accounts, account_ids)
    transactions = _collect_user_transactions(db, account_ids, limit=_chat_rag_transaction_limit())
    rag_document = _build_user_rag_document(
        user=user,
        profile=profile,
        accounts=accounts,
        transactions=transactions,
        account_ids=account_id_set,
    )
    rag_meta = _write_user_rag_document(rag_document)
    return {
        "success": True,
        "document_id": rag_document["document_id"],
        "generated_at": rag_document["generated_at"],
        "scope": rag_document["scope"],
        "file_name": rag_meta["file_name"],
        "write_status": rag_meta["write_status"],
        "account_count": rag_document["account_count"],
        "transaction_count": rag_document["transaction_count"],
        "included_transaction_count": rag_document["included_transaction_count"],
        "document": rag_document,
    }


def _build_effective_question(
    question: str,
    stored_history: list[ChatMessage],
    client_history: list[dict],
) -> tuple[str, set[int]]:
    effective_question = question.strip()
    preferred_tx_ids: set[int] = set()

    history_user_messages = [item.content for item in stored_history if item.role == "user" and item.content]
    for item in reversed(stored_history):
        if item.role == "assistant" and isinstance(item.context, dict):
            preferred_tx_ids.update(item.context.get("transaction_ids") or [])
            break

    if not preferred_tx_ids:
        for item in reversed(client_history):
            if item.get("role") == "assistant":
                preferred_tx_ids.update(item.get("transaction_ids") or [])
                break

    if _is_vague_question(effective_question):
        previous_question = history_user_messages[-1] if history_user_messages else ""
        if not previous_question:
            for item in reversed(client_history):
                if item.get("role") == "user" and item.get("content"):
                    previous_question = str(item["content"])
                    break
        if previous_question:
            effective_question = f"{previous_question}. Theo doi tiep: {effective_question}"

    return effective_question, preferred_tx_ids


def _read_env_value(name: str, default: str = "") -> str:
    raw_value = os.getenv(name)
    if raw_value is not None and str(raw_value).strip():
        return str(raw_value).strip()

    env_path = Path(__file__).with_name(".env")
    if not env_path.is_file():
        return default

    try:
        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            if key.strip() != name:
                continue
            parsed = value.strip().strip('"').strip("'")
            if parsed:
                return parsed
    except OSError:
        return default

    return default


def _groq_api_key() -> str:
    return _read_env_value("GROQ_API_KEY")


def _groq_model() -> str:
    return _read_env_value("GROQ_MODEL", "llama-3.1-8b-instant")


def _groq_base_url() -> str:
    return _read_env_value("GROQ_BASE_URL", "https://api.groq.com/openai/v1").rstrip("/")


def _groq_timeout_seconds() -> int:
    try:
        timeout = int(_read_env_value("GROQ_TIMEOUT_SECONDS", "30"))
    except ValueError:
        timeout = 30
    return max(timeout, 5)


def _ollama_base_url() -> str:
    return _read_env_value(
        "OLLAMA_BASE_URL",
        _read_env_value("OPENAI_BASE_URL", "http://127.0.0.1:11434/v1"),
    ).rstrip("/")


def _ollama_model() -> str:
    return _read_env_value("OLLAMA_MODEL", _read_env_value("CHAT_MODEL", "llama3.2:latest"))


def _ollama_model_candidates() -> list[str]:
    primary_model = _ollama_model()
    raw_fallbacks = _read_env_value("OLLAMA_FALLBACK_MODELS", "llama3.2:1b")
    candidates = [primary_model]
    if ":" not in primary_model:
        candidates.append(f"{primary_model}:latest")
    candidates.extend(item.strip() for item in raw_fallbacks.split(",") if item.strip())

    unique_candidates: list[str] = []
    for model in candidates:
        if model and model not in unique_candidates:
            unique_candidates.append(model)
    return unique_candidates


def _ollama_api_key() -> str:
    return _read_env_value("OLLAMA_API_KEY", _read_env_value("OPENAI_API_KEY", ""))


def _ollama_timeout_seconds() -> int:
    try:
        timeout = int(
            _read_env_value(
                "OLLAMA_TIMEOUT_SECONDS",
                _read_env_value(
                    "CHAT_COMPLETION_TIMEOUT_SEC",
                    _read_env_value("CHAT_COMPLETION_TIMEOUT_SECONDS", "60"),
                ),
            )
        )
    except ValueError:
        timeout = 60
    return max(timeout, 5)


def _chat_llm_max_tokens() -> int:
    try:
        max_tokens = int(_read_env_value("CHAT_MAX_TOKENS", "120"))
    except ValueError:
        max_tokens = 120
    return max(max_tokens, 32)


def _chat_llm_rewrite_factual() -> bool:
    return _read_env_value("CHAT_LLM_REWRITE_FACTUAL", "false").strip().lower() == "true"


def _chat_llm_provider_order() -> list[str]:
    provider = _read_env_value("CHAT_LLM_PROVIDER", "auto").strip().lower()
    if provider in {"off", "none", "disabled"}:
        return []
    if provider in {"ollama", "local"}:
        return ["ollama"]
    if provider == "groq":
        return ["groq"]
    if _groq_api_key():
        return ["groq"]
    return ["ollama"]


def _history_limit_for_query(question: str) -> int:
    normalized = _normalized_no_accents(question)
    if any(
        token in normalized
        for token in ("day du", "toan bo", "tat ca", "full", "lich su", "history", "gan day")
    ):
        return 12
    return 5


def _format_profile_context(profile: dict) -> dict:
    return {
        "username": profile.get("username"),
        "full_name": profile.get("full_name"),
        "phone_number": profile.get("phone_number") or "chua cap nhat",
        "status": str(profile.get("status") or "").lower(),
        "account_count": profile.get("account_count", 0),
        "balances": [
            {
                "account_id": item.get("account_id"),
                "balance": _format_money(item.get("balance")),
                "status": str(item.get("status") or "").lower(),
                "currency": item.get("currency") or "VND",
            }
            for item in profile.get("balances", [])
        ],
        "transaction_count": profile.get("transaction_count", 0),
        "pending_count": profile.get("pending_count", 0),
        "blocked_count": profile.get("blocked_count", 0),
        "completed_count": profile.get("completed_count", 0),
        "last_transaction_at": _format_dt(profile.get("last_transaction_at")),
    }


def _format_history_context(stored_history: list[ChatMessage], limit: int = 6) -> list[dict]:
    history_rows: list[dict] = []
    for item in stored_history[-limit:]:
        content = (item.content or "").strip()
        if not content:
            continue
        history_rows.append(
            {
                "role": item.role,
                "content": content[:500],
            }
        )
    return history_rows


def _build_prompt_payload(
    user: User,
    question: str,
    effective_question: str,
    fallback_answer: str,
    answer_status: str,
    rag_document: dict,
    relevant_transactions: list[dict],
    sources: list[dict],
    account_ids: set[int],
    stored_history: list[ChatMessage],
) -> str:
    profile = rag_document.get("profile_snapshot") or {}
    payload = {
        "scope": "chi duoc tra loi bang du lieu cua user hien tai",
        "rag_snapshot": {
            "document_id": rag_document.get("document_id"),
            "generated_at": rag_document.get("generated_at"),
            "file_name": rag_document.get("file_name"),
            "write_status": rag_document.get("write_status"),
            "account_count": rag_document.get("account_count", 0),
            "transaction_count": rag_document.get("transaction_count", 0),
            "included_transaction_count": rag_document.get("included_transaction_count", 0),
        },
        "customer": {
            "user_id": user.id,
            "username": user.username,
            "full_name": user.full_name,
        },
        "question": question.strip(),
        "effective_question": effective_question.strip(),
        "answer_status": answer_status,
        "profile_summary": rag_document.get("profile_summary") or _format_profile_context(profile),
        "retrieved_transactions": [
            {
                "transaction_id": tx.get("id"),
                "request_id": tx.get("request_id"),
                "summary": _tx_line(tx, account_ids),
                "amount": _format_money(tx.get("amount")),
                "type": tx.get("type"),
                "status": tx.get("status"),
                "risk_level": tx.get("risk_level"),
                "risk_score": tx.get("risk_score"),
                "note": tx.get("note"),
                "created_at": _format_dt(tx.get("created_at")),
            }
            for tx in relevant_transactions
        ],
        "sources": sources,
        "recent_chat_history": _format_history_context(stored_history),
        "fallback_answer": fallback_answer,
    }
    return json.dumps(payload, ensure_ascii=False, indent=2)


def _call_openai_compatible_chat_completion(
    *,
    base_url: str,
    model: str,
    messages: list[dict],
    timeout_seconds: int,
    api_key: str = "",
    max_tokens: int | None = None,
) -> str:
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    payload = json.dumps(
        {
            "model": model,
            "messages": messages,
            "temperature": 0.2,
            "max_tokens": max_tokens or _chat_llm_max_tokens(),
            "stream": False,
        }
    ).encode("utf-8")

    request = urllib.request.Request(
        url=f"{base_url.rstrip('/')}/chat/completions",
        data=payload,
        headers=headers,
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
            body = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"LLM HTTP {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Khong ket noi duoc LLM: {exc.reason}") from exc

    choices = body.get("choices") or []
    if not choices:
        raise RuntimeError("LLM khong tra ve choices.")

    message = choices[0].get("message") or {}
    content = (message.get("content") or "").strip()
    if not content:
        raise RuntimeError("LLM tra ve noi dung rong.")

    return content


def _call_groq_chat_completion(messages: list[dict]) -> str:
    api_key = _groq_api_key()
    if not api_key:
        raise RuntimeError("Groq API key chua duoc cau hinh.")
    return _call_openai_compatible_chat_completion(
        base_url=_groq_base_url(),
        model=_groq_model(),
        messages=messages,
        timeout_seconds=_groq_timeout_seconds(),
        api_key=api_key,
        max_tokens=_chat_llm_max_tokens(),
    )


def _call_ollama_chat_completion(messages: list[dict]) -> str:
    last_error: Exception | None = None
    for model in _ollama_model_candidates():
        try:
            return _call_openai_compatible_chat_completion(
                base_url=_ollama_base_url(),
                model=model,
                messages=messages,
                timeout_seconds=_ollama_timeout_seconds(),
                api_key=_ollama_api_key(),
                max_tokens=_chat_llm_max_tokens(),
            )
        except Exception as exc:
            last_error = exc
            continue
    if last_error is not None:
        raise last_error
    raise RuntimeError("Chua cau hinh Ollama model.")


def _call_chat_llm(provider: str, messages: list[dict]) -> str:
    if provider == "ollama":
        return _call_ollama_chat_completion(messages)
    if provider == "groq":
        return _call_groq_chat_completion(messages)
    raise RuntimeError(f"Provider LLM khong ho tro: {provider}")


def _maybe_generate_llm_answer(
    user: User,
    question: str,
    effective_question: str,
    fallback_answer: str,
    answer_status: str,
    rag_document: dict,
    relevant_transactions: list[dict],
    sources: list[dict],
    account_ids: set[int],
    stored_history: list[ChatMessage],
) -> tuple[str | None, dict]:
    light_statuses = {"greeting", "needs_clarification", "out_of_scope", "no_account", "no_match"}
    if answer_status not in light_statuses and not _chat_llm_rewrite_factual():
        return None, {"llm_status": "skipped_factual_rewrite_disabled"}

    profile = rag_document.get("profile_snapshot") or {}
    if answer_status not in light_statuses and not relevant_transactions and not profile.get("balances"):
        return None, {"llm_status": "skipped_no_context"}

    provider_order = _chat_llm_provider_order()
    if not provider_order:
        return None, {"llm_status": "disabled"}

    system_prompt = (
        "Ban chi lam nhiem vu viet lai cau tra loi cho tro ly giao dich noi bo. "
        "Tra loi bang tieng Viet khong dau, than thien, ngan gon. "
        "Draft answer da duoc backend tao tu RAG cua user hien tai. "
        "Khong them su kien moi, khong doi so tien, ma giao dich, thoi gian, trang thai, risk score hay so du. "
        "Neu draft la loi chao, hay chao tu nhien. "
        "Neu draft la loi tu choi ngoai pham vi, hay tu choi lich su va ngan gon."
    )

    status_instruction = {
        "greeting": "Viet dung 1 cau chao ngan, khong liet ke, khong nhac so lieu hay noi chua co thong tin.",
        "needs_clarification": "Hoi lai 1 cau ngan de user noi ro hon.",
        "out_of_scope": "Tu choi 1-2 cau ngan, lich su.",
        "no_account": "Noi ngan gon rang user chua co tai khoan trong he thong.",
        "no_match": "Noi ngan gon rang khong tim thay giao dich phu hop.",
    }.get(answer_status, "Viet lai ngan gon, giu dung so lieu.")

    user_prompt = (
        f"Cau hoi cua user: {question.strip()}\n"
        f"Answer status: {answer_status}\n"
        f"Yeu cau rieng: {status_instruction}\n"
        "Draft answer can viet lai, giu nguyen y nghia va so lieu:\n"
        f"{fallback_answer[:3000]}"
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    last_error: str | None = None
    for provider in provider_order:
        try:
            answer = _call_chat_llm(provider, messages)
        except Exception as exc:
            last_error = str(exc)
            continue

        normalized = _normalized_no_accents(answer)
        if not normalized:
            last_error = "empty_answer"
            continue
        if "nguoi khac" in normalized and "chinh ban" not in normalized:
            last_error = "unsafe_other_user_answer"
            continue
        if answer_status == "greeting" and (
            "\n" in answer
            or len(answer) > 220
            or any(
                phrase in normalized
                for phrase in (
                    "khong co thong tin",
                    "can biet",
                    "ma giao dich",
                    "so du:",
                    "lich su giao dich:",
                )
            )
        ):
            last_error = "low_quality_greeting"
            continue
        if answer_status != "out_of_scope" and any(
            phrase in normalized
            for phrase in (
                "toi khong the cung cap",
                "toi khong the giup",
                "toi xin loi",
                "chinh sach",
                "luat phap",
                "buoc 1",
                "json",
            )
        ):
            last_error = "low_quality_or_refusal"
            continue
        return answer.strip(), {
            "llm_status": "ok",
            "llm_provider": provider,
            "llm_model": _ollama_model() if provider == "ollama" else _groq_model(),
        }

    return None, {
        "llm_status": "failed",
        "llm_provider": ",".join(provider_order),
        "llm_error": (last_error or "unknown")[:240],
    }


def answer_transaction_chat(
    db: Session,
    user: User,
    question: str,
    client_history: list[dict] | None = None,
) -> dict:
    if not (question or "").strip():
        return {
            "success": False,
            "answer": "Thieu question",
            "answer_status": "invalid",
            "sources": [],
        }

    stored_history = _load_recent_chat_messages(db, user.id)
    effective_question, preferred_tx_ids = _build_effective_question(
        question=question,
        stored_history=stored_history,
        client_history=client_history or [],
    )

    _save_chat_message(
        db,
        user_id=user.id,
        role="user",
        content=question.strip(),
        context={"effective_question": effective_question},
    )

    rag_snapshot = build_user_chat_rag_snapshot(db, user)
    rag_document = rag_snapshot["document"]
    profile = rag_document.get("profile_snapshot") or {}
    transactions = rag_document.get("transactions") or []
    account_ids = [
        item.get("account_id")
        for item in rag_document.get("accounts") or []
        if item.get("account_id") is not None
    ]
    account_id_set = set(account_ids)
    relevant_transactions: list[dict] = []

    if not account_ids:
        answer = _friendly_no_account_answer()
        sources: list[dict] = []
        status = "no_account"
    elif _is_greeting_question(question):
        answer = _friendly_greeting_answer()
        sources = []
        status = "greeting"
    elif _is_vague_question(effective_question):
        answer = _friendly_clarify_answer()
        sources = []
        status = "needs_clarification"
    elif not _is_in_scope(effective_question):
        answer = _friendly_out_of_scope_answer()
        sources = []
        status = "out_of_scope"
    else:
        relevant_transactions = _select_relevant_transactions(
            transactions=transactions,
            question=effective_question,
            account_ids=account_id_set,
            preferred_tx_ids=preferred_tx_ids,
            limit=_history_limit_for_query(effective_question),
        )
        sources = _build_sources(relevant_transactions, account_id_set)
        display_limit = max(1, len(relevant_transactions))

        if _wants_balance(effective_question):
            answer = (
                f"Thong tin tai khoan cua chinh ban: @{profile['username']} - {profile['full_name']}. "
                f"Trang thai user: {str(profile['status']).lower()}. "
                f"So giao dich da ghi nhan: {profile['transaction_count']} "
                f"(completed {profile['completed_count']}, pending {profile['pending_count']}, blocked {profile['blocked_count']}).\n"
                + _friendly_balance_answer(profile)
            )
            status = "balance"
        elif _wants_full_info(effective_question):
            latest_lines = [_tx_line(tx, account_id_set) for tx in (relevant_transactions or transactions[:5])]
            phone_text = profile["phone_number"] or "chua cap nhat"
            answer = (
                f"Day la thong tin cua chinh ban trong he thong:\n"
                f"- Username: @{profile['username']}\n"
                f"- Ho ten: {profile['full_name']}\n"
                f"- So dien thoai: {phone_text}\n"
                f"- Trang thai user: {str(profile['status']).lower()}\n"
                f"- So tai khoan lien ket: {profile['account_count']}\n"
                f"- Tong so giao dich: {profile['transaction_count']}, pending {profile['pending_count']}, blocked {profile['blocked_count']}\n"
                f"- Giao dich gan nhat: {_format_dt(profile['last_transaction_at'])}\n"
                + "\n".join(
                    f"- Tai khoan #{item['account_id']}: {_format_money(item['balance'])} ({item['status']})"
                    for item in profile["balances"]
                )
            )
            if latest_lines:
                answer += "\nCac giao dich khop/gan nhat cua ban:\n" + "\n".join(f"- {line}" for line in latest_lines[:display_limit])
            status = "full_info"
        elif _wants_total(effective_question):
            total_amount = sum(float(tx.get("amount") or 0) for tx in relevant_transactions)
            answer = (
                f"Trong {len(relevant_transactions)} giao dich khop nhat cua chinh ban, tong gia tri la "
                f"{_format_money(total_amount)}."
            )
            if relevant_transactions:
                answer += "\nChi tiet:\n" + "\n".join(f"- {_tx_line(tx, account_id_set)}" for tx in relevant_transactions[:display_limit])
            status = "total"
        elif _wants_risk(effective_question):
            risky = [
                tx
                for tx in relevant_transactions
                if tx.get("status") in {"PENDING", "BLOCKED"} or str(tx.get("risk_level") or "").upper() in {"HIGH", "CRITICAL"}
            ]
            selected = risky or relevant_transactions
            if not selected:
                answer = "Toi chua thay giao dich canh bao/pending/block nao cua chinh ban trong du lieu hien tai."
                status = "risk_none"
            else:
                answer = "Cac giao dich rui ro/trang thai can luu y cua chinh ban:\n" + "\n".join(
                    f"- {_tx_line(tx, account_id_set)}" for tx in selected[:display_limit]
                )
                status = "risk"
                sources = _build_sources(selected[:display_limit], account_id_set)
        else:
            if not relevant_transactions:
                answer = _friendly_no_match_answer()
                status = "no_match"
            elif len(relevant_transactions) == 1 and (
                _extract_transaction_ids(effective_question)
                or _parse_amount_tokens(effective_question)
                or "khi nao" in _normalized_no_accents(effective_question)
                or "cho ai" in _normalized_no_accents(effective_question)
                or "tu ai" in _normalized_no_accents(effective_question)
            ):
                answer = f"Giao dich khop nhat cua chinh ban la: {_tx_line(relevant_transactions[0], account_id_set)}"
                status = "single_match"
            else:
                answer = _friendly_history_answer(relevant_transactions, account_id_set, display_limit)
                status = "history"

    llm_answer, llm_meta = _maybe_generate_llm_answer(
        user=user,
        question=question,
        effective_question=effective_question,
        fallback_answer=answer,
        answer_status=status,
        rag_document=rag_document,
        relevant_transactions=relevant_transactions,
        sources=sources,
        account_ids=account_id_set,
        stored_history=stored_history,
    )
    if llm_answer:
        answer = llm_answer
    elif llm_meta.get("llm_status") == "failed":
        llm_meta["llm_status"] = "fallback"

    _save_chat_message(
        db,
        user_id=user.id,
        role="assistant",
        content=answer,
        context={
            "answer_status": status,
            "rag_document_id": rag_document.get("document_id"),
            "rag_generated_at": rag_document.get("generated_at"),
            "llm_provider": llm_meta.get("llm_provider"),
            "llm_status": llm_meta.get("llm_status"),
            "llm_model": llm_meta.get("llm_model"),
            "llm_error": llm_meta.get("llm_error"),
            "transaction_ids": [item.get("transaction_id") for item in sources if item.get("transaction_id") is not None],
        },
    )

    return {
        "success": True,
        "answer": answer,
        "answer_status": status,
        "scope": "current_user_transactions",
        "rag_document_id": rag_document.get("document_id"),
        "rag_generated_at": rag_document.get("generated_at"),
        "rag_file_name": rag_snapshot.get("file_name"),
        "rag_write_status": rag_snapshot.get("write_status"),
        "llm_provider": llm_meta.get("llm_provider"),
        "llm_status": llm_meta.get("llm_status"),
        "llm_model": llm_meta.get("llm_model"),
        "sources": sources,
    }
