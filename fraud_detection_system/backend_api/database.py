import json
import os
import uuid
from contextlib import contextmanager
from datetime import date, datetime, timedelta

import pymysql
from pymysql.cursors import DictCursor


def _load_local_env():
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if not os.path.exists(env_path):
        return

    with open(env_path, "r", encoding="utf-8") as env_file:
        for raw_line in env_file:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip())


_load_local_env()

DB_NAME = os.getenv("DB_NAME", "fraud_detection")
DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
MODEL_VERSION = os.getenv("MODEL_VERSION", "fraud_detection_pipeline.pkl")


def _connection_config(use_database=True):
    config = {
        "host": DB_HOST,
        "port": DB_PORT,
        "user": DB_USER,
        "password": DB_PASSWORD,
        "charset": "utf8mb4",
        "cursorclass": DictCursor,
        "autocommit": False,
    }
    if use_database:
        config["database"] = DB_NAME
    return config


@contextmanager
def get_connection(use_database=True):
    conn = pymysql.connect(**_connection_config(use_database=use_database))
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    with get_connection(use_database=False) as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )

    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS prediction_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    transaction_code VARCHAR(40) NOT NULL UNIQUE,
                    step INT NOT NULL,
                    transaction_type VARCHAR(32) NOT NULL,
                    amount DECIMAL(18, 2) NOT NULL,
                    oldbalance_org DECIMAL(18, 2) NOT NULL,
                    newbalance_orig DECIMAL(18, 2) NOT NULL,
                    oldbalance_dest DECIMAL(18, 2) NOT NULL,
                    newbalance_dest DECIMAL(18, 2) NOT NULL,
                    risk_score DECIMAL(5, 2) NOT NULL,
                    risk_level VARCHAR(16) NOT NULL,
                    is_fraud TINYINT(1) NOT NULL DEFAULT 0,
                    explanations LONGTEXT NOT NULL,
                    request_payload LONGTEXT NOT NULL,
                    review_status VARCHAR(32) NOT NULL DEFAULT 'Pending',
                    review_note TEXT NULL,
                    model_version VARCHAR(120) NOT NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                        ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_risk_level (risk_level),
                    INDEX idx_transaction_type (transaction_type),
                    INDEX idx_created_at (created_at)
                )
                """
            )


def _transaction_code():
    stamp = datetime.now().strftime("%Y%m%d%H%M%S")
    return f"TRX-{stamp}-{uuid.uuid4().hex[:6].upper()}"


def _json_default(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return str(value)


def _date_key(value):
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value))


def save_prediction_log(transaction, prediction, model_version=MODEL_VERSION):
    payload = transaction.model_dump()
    explanations = prediction.explanations
    transaction_code = _transaction_code()

    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO prediction_logs (
                    transaction_code, step, transaction_type, amount,
                    oldbalance_org, newbalance_orig, oldbalance_dest,
                    newbalance_dest, risk_score, risk_level, is_fraud,
                    explanations, request_payload, model_version
                )
                VALUES (
                    %(transaction_code)s, %(step)s, %(transaction_type)s,
                    %(amount)s, %(oldbalance_org)s, %(newbalance_orig)s,
                    %(oldbalance_dest)s, %(newbalance_dest)s,
                    %(risk_score)s, %(risk_level)s, %(is_fraud)s,
                    %(explanations)s, %(request_payload)s, %(model_version)s
                )
                """,
                {
                    "transaction_code": transaction_code,
                    "step": transaction.step,
                    "transaction_type": transaction.type.upper(),
                    "amount": transaction.amount,
                    "oldbalance_org": transaction.oldbalanceOrg,
                    "newbalance_orig": transaction.newbalanceOrig,
                    "oldbalance_dest": transaction.oldbalanceDest,
                    "newbalance_dest": transaction.newbalanceDest,
                    "risk_score": prediction.risk_score,
                    "risk_level": prediction.risk_level,
                    "is_fraud": 1 if prediction.risk_level == "High" else 0,
                    "explanations": json.dumps(explanations, ensure_ascii=False),
                    "request_payload": json.dumps(payload, ensure_ascii=False),
                    "model_version": model_version,
                },
            )
            return cursor.lastrowid


def _serialize_log(row):
    created_at = row.get("created_at")
    if isinstance(created_at, datetime):
        created_at = created_at.strftime("%Y-%m-%d %H:%M:%S")

    return {
        "id": row["id"],
        "transaction_id": row["transaction_code"],
        "time": created_at,
        "step": row["step"],
        "type": row["transaction_type"],
        "amount": float(row["amount"]),
        "oldbalanceOrg": float(row["oldbalance_org"]),
        "newbalanceOrig": float(row["newbalance_orig"]),
        "oldbalanceDest": float(row["oldbalance_dest"]),
        "newbalanceDest": float(row["newbalance_dest"]),
        "risk_score": float(row["risk_score"]),
        "risk_level": row["risk_level"],
        "is_fraud": bool(row["is_fraud"]),
        "review_status": row["review_status"],
        "review_note": row["review_note"],
        "model_version": row["model_version"],
        "explanations": json.loads(row["explanations"] or "[]"),
    }


def list_prediction_logs(page=1, limit=10, risk=None, tx_type=None, search=None):
    page = max(page, 1)
    limit = min(max(limit, 1), 100)
    offset = (page - 1) * limit

    where = []
    params = {}

    if risk and risk.lower() != "all":
        where.append("risk_level = %(risk)s")
        params["risk"] = risk.title()

    if tx_type and tx_type.lower() != "all":
        where.append("transaction_type = %(tx_type)s")
        params["tx_type"] = tx_type.upper()

    if search:
        where.append("(transaction_code LIKE %(search)s OR transaction_type LIKE %(search)s)")
        params["search"] = f"%{search}%"

    where_sql = f"WHERE {' AND '.join(where)}" if where else ""

    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(f"SELECT COUNT(*) AS total FROM prediction_logs {where_sql}", params)
            total = cursor.fetchone()["total"]

            params.update({"limit": limit, "offset": offset})
            cursor.execute(
                f"""
                SELECT *
                FROM prediction_logs
                {where_sql}
                ORDER BY created_at DESC, id DESC
                LIMIT %(limit)s OFFSET %(offset)s
                """,
                params,
            )
            rows = cursor.fetchall()

    return {
        "items": [_serialize_log(row) for row in rows],
        "page": page,
        "limit": limit,
        "total": total,
        "total_pages": (total + limit - 1) // limit if total else 1,
    }


def get_dashboard_summary():
    today = date.today()
    start_date = today - timedelta(days=6)

    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    COUNT(*) AS total,
                    COALESCE(SUM(risk_level = 'High'), 0) AS high_risk,
                    COALESCE(SUM(risk_level = 'Low'), 0) AS low_risk
                FROM prediction_logs
                """
            )
            stats = cursor.fetchone()

            cursor.execute(
                """
                SELECT risk_level, COUNT(*) AS value
                FROM prediction_logs
                GROUP BY risk_level
                """
            )
            distribution_rows = cursor.fetchall()

            cursor.execute(
                """
                SELECT
                    DATE(created_at) AS day,
                    COUNT(*) AS total,
                    COALESCE(SUM(risk_level = 'High'), 0) AS fraud
                FROM prediction_logs
                WHERE DATE(created_at) BETWEEN %(start_date)s AND %(today)s
                GROUP BY DATE(created_at)
                ORDER BY DATE(created_at)
                """,
                {"start_date": start_date, "today": today},
            )
            daily_rows = cursor.fetchall()

            cursor.execute(
                """
                SELECT *
                FROM prediction_logs
                WHERE risk_level = 'High'
                ORDER BY created_at DESC, id DESC
                LIMIT 5
                """
            )
            recent_alerts = cursor.fetchall()

    total = int(stats["total"] or 0)
    high_risk = int(stats["high_risk"] or 0)
    low_risk = int(stats["low_risk"] or 0)
    safe_rate = round((low_risk / total) * 100, 1) if total else 0.0

    distribution_map = {row["risk_level"]: int(row["value"]) for row in distribution_rows}
    risk_distribution = [
        {"name": "Low Risk", "risk_level": "Low", "value": distribution_map.get("Low", 0), "color": "#10b981"},
        {"name": "Medium Risk", "risk_level": "Medium", "value": distribution_map.get("Medium", 0), "color": "#f59e0b"},
        {"name": "High Risk", "risk_level": "High", "value": distribution_map.get("High", 0), "color": "#ef4444"},
    ]

    daily_map = {_date_key(row["day"]): row for row in daily_rows}
    weekly_data = []
    for i in range(7):
        current = start_date + timedelta(days=i)
        row = daily_map.get(current)
        weekly_data.append(
            {
                "day": current.strftime("%a"),
                "total": int(row["total"]) if row else 0,
                "fraud": int(row["fraud"]) if row else 0,
            }
        )

    return {
        "stats": {
            "total_transactions": total,
            "high_risk": high_risk,
            "safe_rate": safe_rate,
        },
        "risk_distribution": risk_distribution,
        "weekly_data": weekly_data,
        "recent_alerts": [_serialize_log(row) for row in recent_alerts],
        "model_metrics": [
            {"name": "F1-Score", "value": 94.5, "color": "bg-blue-500"},
            {"name": "Recall", "value": 98.2, "color": "bg-indigo-500"},
            {"name": "Precision", "value": 91.0, "color": "bg-violet-500"},
        ],
    }


def update_log_review(log_id, review_status, review_note=None):
    allowed_statuses = {"Pending", "Confirmed Fraud", "False Positive", "Safe"}
    if review_status not in allowed_statuses:
        raise ValueError("Invalid review status")

    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                UPDATE prediction_logs
                SET review_status = %(review_status)s,
                    review_note = %(review_note)s
                WHERE id = %(log_id)s
                """,
                {
                    "log_id": log_id,
                    "review_status": review_status,
                    "review_note": review_note,
                },
            )
            return cursor.rowcount
