from __future__ import annotations

import json
import random
import sys
from datetime import datetime
from pathlib import Path

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import FeatureUnion, Pipeline


PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = PROJECT_ROOT / "backend_api"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from chat_ml_service import normalize_chat_text  # noqa: E402


RNG = random.Random(42)
COMMON_PREFIXES = [
    "",
    "ban oi ",
    "bot oi ",
    "cho toi ",
    "cho minh ",
    "lam on ",
    "giup minh ",
]
COMMON_SUFFIXES = [
    "",
    " nhe",
    " di",
    " duoc khong",
    " giup minh",
    "?",
]


def _normalize_unique(values: list[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for value in values:
        normalized = normalize_chat_text(value)
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        ordered.append(normalized)
    return ordered


def _augment_phrases(phrases: list[str], samples_per_phrase: int = 6) -> list[str]:
    collected: list[str] = []
    for phrase in phrases:
        collected.append(phrase)
        for _ in range(samples_per_phrase):
            prefix = RNG.choice(COMMON_PREFIXES)
            suffix = RNG.choice(COMMON_SUFFIXES)
            collected.append(f"{prefix}{phrase}{suffix}")
    return _normalize_unique(collected)


def _sample_from_templates(
    templates: list[str],
    slots: dict[str, list[str]],
    samples_per_template: int = 14,
) -> list[str]:
    collected: list[str] = []
    slot_names = list(slots.keys())
    for template in templates:
        for _ in range(samples_per_template):
            values = {name: RNG.choice(slots[name]) for name in slot_names}
            collected.append(template.format(**values))
    return _normalize_unique(collected)


def build_dataset() -> pd.DataFrame:
    tx_ids = ["1", "12", "24", "54", "77", "101", "177", "202", "345", "512"]
    amounts = ["100k", "200k", "500k", "750k", "1 trieu", "2 trieu", "5 trieu", "10 trieu", "250000", "1250000"]
    counterparties = ["khanh", "lan", "minh", "nam", "anh", "hien", "tai khoan 12", "tai khoan 23"]
    times = ["hom nay", "hom qua", "24h qua", "thang nay", "gan day", "luc 13h", "luc 08h30", "cuoi tuan"]
    request_ids = [
        "TXN-1778161024302-KK4D0K",
        "TXN-1777453782626-BB3HLF",
        "TXN-1777011111111-AB12CD",
        "TXN-1777123456789-ZZ9QWE",
    ]

    rows: list[dict[str, str]] = []

    def add(label: str, phrases: list[str], slots: dict[str, list[str]] | None = None) -> None:
        examples = _sample_from_templates(phrases, slots) if slots else _augment_phrases(phrases)
        for text in examples:
            rows.append({"text": text, "label": label})

    add(
        "greeting",
        [
            "xin chao",
            "chao ban",
            "chao bot",
            "hello",
            "hey bot",
            "alo bot oi",
            "bot oi",
            "chao he thong",
        ],
    )
    add(
        "needs_clarification",
        [
            "cai do la gi",
            "cai nay la sao",
            "do la gi",
            "the con",
            "sao nua",
            "vay la sao",
            "khong hieu",
            "ban noi ro hon duoc khong",
            "giai thich lai di",
        ],
    )
    add(
        "out_of_scope",
        [
            "du bao thoi tiet hom nay",
            "ket qua bong da hom nay",
            "viet giup minh doan code",
            "giai phuong trinh nay",
            "tin tuc hom nay co gi moi",
            "gia vang hom nay bao nhieu",
            "mua nha o dau tot",
            "hoc python co kho khong",
        ],
    )
    add(
        "balance",
        [
            "so du cua toi",
            "kiem tra so du",
            "sd cua toi",
            "tai khoan con bao nhieu tien",
            "con bao nhieu tien trong tai khoan",
            "balance hien tai",
            "cho xem so du",
            "vi co bao nhieu",
            "check balance",
        ],
    )
    add(
        "full_info",
        [
            "thong tin day du cua toi",
            "tong quan tai khoan",
            "xem profile cua toi",
            "xem toan bo thong tin",
            "thong tin tai khoan va giao dich",
            "full thong tin",
            "ban ghi day du cua toi la gi",
        ],
    )
    add(
        "history",
        [
            "lich su giao dich cua toi",
            "danh sach giao dich",
            "xem giao dich cua toi",
            "giao dich gan day",
            "giao dich cua toi la gi",
            "lich su gd",
            "xem lich su giao dich",
            "cac giao dich da thuc hien",
        ],
    )
    add(
        "recent_history",
        [
            "5 giao dich gan nhat",
            "giao dich moi nhat",
            "lich su moi nhat",
            "nhung giao dich gan day",
            "xem 3 giao dich cuoi",
            "recent transactions",
            "giao dich gan nhat cua toi",
        ],
    )
    add(
        "total",
        [
            "tong gia tri giao dich",
            "tong tien giao dich",
            "tong so tien",
            "cong tat ca giao dich",
            "tong value giao dich",
            "tong tien trong 24h qua",
            "tong tien thang nay",
            "bao nhieu tien da chuyen",
        ],
    )
    add(
        "risk",
        [
            "giao dich nao rui ro",
            "co giao dich fraud khong",
            "canh bao gian lan",
            "giao dich bat thuong",
            "risk cao la giao dich nao",
            "giao dich nao can luu y",
            "co giao dich nao nguy hiem khong",
        ],
    )
    add(
        "pending",
        [
            "giao dich pending",
            "giao dich nao pending",
            "co giao dich pending nao khong",
            "danh sach pending",
            "nhung giao dich pending",
            "giao dich cho xu ly",
            "giao dich nao dang cho xu ly",
            "dang cho duyet",
            "cho otp",
            "giao dich chua xac nhan",
            "giao dich dang cho",
        ],
    )
    add(
        "blocked",
        [
            "giao dich bi chan",
            "giao dich nao bi chan",
            "co giao dich bi chan nao khong",
            "danh sach blocked",
            "nhung giao dich blocked",
            "blocked",
            "bi khoa",
            "khong duoc duyet",
            "giao dich bi tu choi",
            "tai khoan bi chan giao dich",
        ],
    )
    add(
        "incoming",
        [
            "ai chuyen tien cho toi",
            "nhan tien tu ai",
            "toi nhan tien tu ai",
            "giao dich nhan tien",
            "tien vao tai khoan tu dau",
            "ai gui tien vao cho toi",
        ],
    )
    add(
        "outgoing",
        [
            "toi chuyen tien cho ai",
            "toi gui tien di dau",
            "giao dich chuyen tien di",
            "toi da gui tien cho ai",
            "tien ra khoi tai khoan di dau",
            "ai nhan tien tu toi",
        ],
    )
    add(
        "transaction_detail",
        [
            "chi tiet giao dich {tx_id}",
            "giao dich #{tx_id}",
            "ma giao dich {request_id}",
            "giao dich {amount} cho {counterparty}",
            "toi chuyen {amount} cho {counterparty}",
            "toi nhan {amount} tu {counterparty}",
            "giao dich voi so tien {amount}",
            "giao dich nay luc {time}",
            "xem giao dich {tx_id} khi nao",
            "giao dich {amount} co gi bat thuong",
        ],
        slots={
            "tx_id": tx_ids,
            "amount": amounts,
            "counterparty": counterparties,
            "time": times,
            "request_id": request_ids,
        },
    )
    add(
        "transfer",
        [
            "chuyen khoan",
            "transfer tien",
            "giao dich transfer",
            "toi muon chuyen tien",
            "lenh chuyen tien",
            "chuyen tien cho nguoi khac",
        ],
    )
    add(
        "cash_in",
        [
            "nap tien",
            "cash in",
            "nop tien vao tai khoan",
            "gui tien vao",
            "giao dich nap tien",
            "tien vao tai khoan",
        ],
    )
    add(
        "cash_out",
        [
            "rut tien",
            "cash out",
            "rut tien ra",
            "lay tien ra",
            "giao dich rut tien",
            "tien di ra",
        ],
    )
    add(
        "payment",
        [
            "thanh toan",
            "payment",
            "tra tien hoa don",
            "giao dich thanh toan",
            "pay hoa don",
            "thanh toan don hang",
        ],
    )

    return pd.DataFrame(rows).drop_duplicates().reset_index(drop=True)


def train_model(dataset: pd.DataFrame) -> dict:
    X_train, X_test, y_train, y_test = train_test_split(
        dataset["text"].tolist(),
        dataset["label"].tolist(),
        test_size=0.2,
        random_state=42,
        stratify=dataset["label"].tolist(),
    )

    pipeline = Pipeline(
        steps=[
            (
                "features",
                FeatureUnion(
                    [
                        (
                            "char_tfidf",
                            TfidfVectorizer(
                                analyzer="char_wb",
                                ngram_range=(3, 5),
                                lowercase=False,
                                max_features=6000,
                            ),
                        ),
                        (
                            "word_tfidf",
                            TfidfVectorizer(
                                analyzer="word",
                                ngram_range=(1, 3),
                                lowercase=False,
                                max_features=5000,
                            ),
                        ),
                    ]
                ),
            ),
            (
                "clf",
                LogisticRegression(
                    max_iter=2000,
                    class_weight="balanced",
                    random_state=42,
                ),
            ),
        ]
    )

    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)
    y_prob = pipeline.predict_proba(X_test)

    report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
    train_accuracy = accuracy_score(y_train, pipeline.predict(X_train))
    test_accuracy = accuracy_score(y_test, y_pred)

    bundle = {
        "pipeline": pipeline,
        "classes": list(pipeline.classes_),
        "dataset_size": int(len(dataset)),
        "train_accuracy": float(train_accuracy),
        "test_accuracy": float(test_accuracy),
        "report": report,
        "trained_at": datetime.utcnow().isoformat(),
    }
    return bundle


def main() -> None:
    data_dir = PROJECT_ROOT / "machine_learning" / "data"
    model_dir = PROJECT_ROOT / "machine_learning" / "models"
    data_dir.mkdir(parents=True, exist_ok=True)
    model_dir.mkdir(parents=True, exist_ok=True)

    dataset = build_dataset()
    dataset_path = data_dir / "chat_intent_dataset.csv"
    dataset.to_csv(dataset_path, index=False, encoding="utf-8")

    bundle = train_model(dataset)
    model_path = model_dir / "chat_intent_pipeline.joblib"
    metadata_path = model_dir / "chat_intent_metadata.json"
    joblib.dump(bundle, model_path, compress=3)

    metadata = {
        "dataset_path": str(dataset_path),
        "model_path": str(model_path),
        "dataset_size": bundle["dataset_size"],
        "train_accuracy": bundle["train_accuracy"],
        "test_accuracy": bundle["test_accuracy"],
        "trained_at": bundle["trained_at"],
        "labels": bundle["classes"],
    }
    metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Dataset saved: {dataset_path}")
    print(f"Model saved: {model_path}")
    print(f"Metadata saved: {metadata_path}")
    print(f"Dataset rows: {bundle['dataset_size']}")
    print(f"Train accuracy: {bundle['train_accuracy']:.4f}")
    print(f"Test accuracy: {bundle['test_accuracy']:.4f}")


if __name__ == "__main__":
    main()
