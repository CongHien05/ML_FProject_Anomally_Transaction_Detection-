from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
import re
import unicodedata

import joblib


@dataclass(frozen=True)
class ChatIntentPrediction:
    label: str
    confidence: float
    source: str
    model_path: str | None = None


_GREETINGS = {
    "alo",
    "chao",
    "chao ban",
    "chao bot",
    "hello",
    "hey",
    "hi",
    "xin chao",
}

_CLARIFY = {
    "cai do la gi",
    "cai nay la gi",
    "cai nay la sao",
    "do la gi",
    "hieu sao",
    "khong hieu",
    "the con",
    "sao nua",
    "vay la sao",
}

_OUT_OF_SCOPE = {
    "du bao thoi tiet",
    "giai phuong trinh",
    "hoc lap trinh",
    "ket qua bong da",
    "mua nha",
    "tin tuc hom nay",
    "tra cuu diem thi",
    "viet code",
}

_BALANCE = {
    "balance",
    "kiem tra so du",
    "so du",
    "so tien hien tai",
    "tai khoan con bao nhieu",
    "con bao nhieu tien",
    "sd cua toi",
    "check balance",
    "vi co bao nhieu",
}

_PROFILE = {
    "full thong tin",
    "thong tin day du",
    "thong tin tai khoan",
    "tong quan tai khoan",
    "xem profile",
    "xem toan bo thong tin",
}

_HISTORY = {
    "danh sach giao dich",
    "giao dich cua toi",
    "giao dich gan day",
    "lich su gd",
    "lich su giao dich",
    "xem giao dich",
    "xem lich su",
}

_RECENT_HISTORY = {
    "5 giao dich gan nhat",
    "giao dich gan nhat",
    "giao dich moi nhat",
    "lich su moi nhat",
    "moi nhat",
    "recent transactions",
}

_TOTAL = {
    "tong gia tri giao dich",
    "tong tien",
    "tong tien giao dich",
    "tong so tien",
    "tong value",
    "tong giao dich",
}

_RISK = {
    "canh bao",
    "fraud",
    "gian lan",
    "nguy co",
    "rui ro",
    "risk",
    "giao dich bat thuong",
}

_PENDING = {
    "cho duyet",
    "cho xu ly",
    "pending",
    "cho otp",
    "dang cho",
}

_BLOCKED = {
    "blocked",
    "bi chan",
    "bi khoa",
    "khong duoc duyet",
    "bi tu choi",
}

_INCOMING = {
    "ai chuyen tien cho toi",
    "nhan tien tu ai",
    "toi nhan",
    "tien vao",
    "nhan tien",
}

_OUTGOING = {
    "toi chuyen tien cho ai",
    "toi gui tien",
    "chuyen tien di",
    "gui tien",
    "chuyen tien",
}

_TRANSFER = {
    "transfer",
    "chuyen khoan",
    "chuyen tien",
}

_CASH_IN = {
    "cash in",
    "nap tien",
    "nop tien",
    "gui tien vao",
    "tien nap vao",
}

_CASH_OUT = {
    "cash out",
    "rut tien",
    "rut tien ra",
    "lay tien ra",
}

_PAYMENT = {
    "payment",
    "thanh toan",
    "tra tien",
    "hoa don",
    "pay",
}

_DETAIL_HINTS = {
    "chi tiet giao dich",
    "giao dich nay",
    "ma giao dich",
    "transaction",
    "tx ",
    "#",
    "luc nao",
    "khi nao",
    "cho ai",
    "tu ai",
}


def normalize_chat_text(text: str) -> str:
    normalized = unicodedata.normalize("NFD", text or "")
    stripped = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    return re.sub(r"\s+", " ", stripped).strip().lower()


def _has_phrase(text: str, phrase: str) -> bool:
    if " " in phrase:
        return phrase in text
    return re.search(rf"\b{re.escape(phrase)}\b", text) is not None


def _project_root() -> Path:
    return Path(__file__).resolve().parent.parent


def _model_path() -> Path:
    return _project_root() / "machine_learning" / "models" / "chat_intent_pipeline.joblib"


def _metadata_path() -> Path:
    return _project_root() / "machine_learning" / "models" / "chat_intent_metadata.json"


def _heuristic_intent(question: str) -> str:
    normalized = normalize_chat_text(question)
    if not normalized:
        return "needs_clarification"
    if normalized in _GREETINGS or any(_has_phrase(normalized, item) for item in _GREETINGS):
        return "greeting"
    if normalized in _CLARIFY or any(_has_phrase(normalized, item) for item in _CLARIFY):
        return "needs_clarification"
    if any(_has_phrase(normalized, item) for item in _OUT_OF_SCOPE):
        return "out_of_scope"
    if any(_has_phrase(normalized, item) for item in _BALANCE):
        return "balance"
    if any(_has_phrase(normalized, item) for item in _PROFILE):
        return "full_info"
    if any(_has_phrase(normalized, item) for item in _RECENT_HISTORY):
        return "recent_history"
    if any(_has_phrase(normalized, item) for item in _RISK):
        return "risk"
    if any(_has_phrase(normalized, item) for item in _PENDING):
        return "pending"
    if any(_has_phrase(normalized, item) for item in _BLOCKED):
        return "blocked"
    if any(_has_phrase(normalized, item) for item in _TOTAL):
        return "total"
    if any(_has_phrase(normalized, item) for item in _INCOMING):
        return "incoming"
    if any(_has_phrase(normalized, item) for item in _OUTGOING):
        return "outgoing"
    if any(_has_phrase(normalized, item) for item in _TRANSFER):
        return "transfer"
    if any(_has_phrase(normalized, item) for item in _CASH_IN):
        return "cash_in"
    if any(_has_phrase(normalized, item) for item in _CASH_OUT):
        return "cash_out"
    if any(_has_phrase(normalized, item) for item in _PAYMENT):
        return "payment"
    if any(_has_phrase(normalized, item) for item in _DETAIL_HINTS) or re.search(r"\d", normalized):
        return "transaction_detail"
    if any(_has_phrase(normalized, item) for item in _HISTORY):
        return "history"
    return "needs_clarification"


@lru_cache(maxsize=1)
def _load_bundle() -> dict | None:
    path = _model_path()
    if not path.is_file():
        return None

    try:
        bundle = joblib.load(path)
    except Exception:
        return None

    if isinstance(bundle, dict):
        return bundle

    return {"pipeline": bundle}


def _extract_pipeline(bundle: dict) -> object | None:
    pipeline = bundle.get("pipeline")
    if pipeline is None:
        pipeline = bundle.get("model")
    if pipeline is not None:
        return pipeline
    return bundle


def predict_chat_intent(question: str, min_confidence: float = 0.30) -> ChatIntentPrediction:
    normalized = normalize_chat_text(question)
    fallback_label = _heuristic_intent(normalized)

    if not normalized:
        return ChatIntentPrediction(
            label=fallback_label,
            confidence=1.0,
            source="heuristic",
            model_path=str(_model_path()),
        )

    bundle = _load_bundle()
    if bundle is None:
        return ChatIntentPrediction(
            label=fallback_label,
            confidence=0.0,
            source="heuristic",
            model_path=str(_model_path()),
        )

    pipeline = _extract_pipeline(bundle)
    if pipeline is None or not hasattr(pipeline, "predict_proba"):
        return ChatIntentPrediction(
            label=fallback_label,
            confidence=0.0,
            source="heuristic",
            model_path=str(_model_path()),
        )

    try:
        probabilities = pipeline.predict_proba([normalized])[0]
        classes = list(getattr(pipeline, "classes_", []))
        if not classes:
            classes = list(bundle.get("classes") or [])
        if not classes:
            raise RuntimeError("Missing class labels in chat intent bundle.")
        best_index = max(range(len(probabilities)), key=probabilities.__getitem__)
        label = str(classes[best_index])
        confidence = float(probabilities[best_index])
    except Exception:
        return ChatIntentPrediction(
            label=fallback_label,
            confidence=0.0,
            source="heuristic",
            model_path=str(_model_path()),
        )

    if confidence < min_confidence:
        return ChatIntentPrediction(
            label=fallback_label,
            confidence=confidence,
            source="heuristic",
            model_path=str(_model_path()),
        )

    return ChatIntentPrediction(
        label=label,
        confidence=confidence,
        source="model",
        model_path=str(_model_path()),
    )


def semantic_similarity_scores(query: str, documents: list[str]) -> list[float]:
    if not documents:
        return []

    normalized_query = normalize_chat_text(query)
    normalized_documents = [normalize_chat_text(item) for item in documents]
    if not normalized_query or not any(normalized_documents):
        return [0.0 for _ in documents]

    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity
    except Exception:
        return [0.0 for _ in documents]

    vectorizer = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), min_df=1)
    matrix = vectorizer.fit_transform([normalized_query, *normalized_documents])
    scores = cosine_similarity(matrix[0:1], matrix[1:]).ravel()
    return [float(score) for score in scores]
