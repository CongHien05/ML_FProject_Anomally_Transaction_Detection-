from auth_service import hash_password
from database import SessionLocal, init_db
from models import Account, AdminReview, Alert, FraudPrediction, Transaction, User


SEED_USERS = [
    {"username": "admin",   "password": "admin123", "full_name": "System Admin",   "phone_number": None,           "role": "ADMIN", "balance": 0},
    {"username": "alice",   "password": "123456",   "full_name": "Alice Nguyen",   "phone_number": None,           "role": "USER",  "balance": 1_000_000},
    {"username": "bob",     "password": "123456",   "full_name": "Bob Tran",       "phone_number": None,           "role": "USER",  "balance": 850_000},
    {"username": "charlie", "password": "123456",   "full_name": "Charlie Pham",   "phone_number": None,           "role": "USER",  "balance": 2_500_000},
    {"username": "dana",    "password": "123456",   "full_name": "Dana Le",        "phone_number": None,           "role": "USER",  "balance": 400_000},
    {"username": "eric",    "password": "123456",   "full_name": "Eric Hoang",     "phone_number": None,           "role": "USER",  "balance": 5_000_000},
    {"username": "fiona",   "password": "123456",   "full_name": "Fiona Do",       "phone_number": None,           "role": "USER",  "balance": 750_000},
    {"username": "giang",   "password": "123456",   "full_name": "Giang Vu",       "phone_number": None,           "role": "USER",  "balance": 1_200_000},
    {"username": "huy",     "password": "123456",   "full_name": "Huy Bui",        "phone_number": None,           "role": "USER",  "balance": 300_000},
    {"username": "linh",    "password": "123456",   "full_name": "Linh Dang",      "phone_number": None,           "role": "USER",  "balance": 3_000_000},
    {"username": "hien",    "password": "123456",   "full_name": "Hien",           "phone_number": "0355484973",   "role": "USER",  "balance": 1_500_000},
    {"username": "khanh",   "password": "123456",   "full_name": "Khanh",          "phone_number": "0949103246",   "role": "USER",  "balance": 2_000_000},

    # ── Tài khoản test theo mức rủi ro ─────────────────────────────────────────
    # Thresholds: drain>=0.99→+40 | drain>=0.95→+25 | drain>=0.75→+12
    #             large(>5M)+new→+30 | new_receiver→+5   ML_base≈17
    #
    # LOW  (<40):      t_low  → chuyển 50k-100k   → chỉ ML≈5, không rule
    # MEDIUM (40-74):  t_medium → chuyển 2.85M/3M (ratio=0.95, <5M) → 17+25+5=47
    # HIGH  (75-89):   t_high   → chuyển 5.7M/6M  (ratio=0.95, >5M) → 17+25+30+5=77
    # CRITICAL (>=90): t_critical→ chuyển 14.95M/15M (ratio=0.997,>5M)→ 17+40+30+5=92
    {"username": "t_low",      "password": "123456", "full_name": "[TEST] Rủi ro Thấp",     "phone_number": "0900000001", "role": "USER", "balance": 500_000},
    {"username": "t_medium",   "password": "123456", "full_name": "[TEST] Rủi ro Trung bình","phone_number": "0900000002", "role": "USER", "balance": 3_000_000},
    {"username": "t_high",     "password": "123456", "full_name": "[TEST] Rủi ro Cao",       "phone_number": "0900000003", "role": "USER", "balance": 6_000_000},
    {"username": "t_critical", "password": "123456", "full_name": "[TEST] Rủi ro Rất cao",   "phone_number": "0900000004", "role": "USER", "balance": 15_000_000},
    {"username": "t_rich",     "password": "123456", "full_name": "[TEST] Tài khoản lớn",    "phone_number": "0900000005", "role": "USER", "balance": 50_000_000},
    {"username": "t_receiver", "password": "123456", "full_name": "[TEST] Người nhận",       "phone_number": "0900000006", "role": "USER", "balance": 1_000_000},
]


def seed() -> None:
    init_db()
    db = SessionLocal()
    try:
        db.query(Alert).delete()
        db.query(AdminReview).delete()
        db.query(FraudPrediction).delete()
        db.query(Transaction).delete()

        for item in SEED_USERS:
            user = db.query(User).filter(User.username == item["username"]).one_or_none()
            if user is None:
                user = User(
                    username=item["username"],
                    password_hash=hash_password(item["password"]),
                    full_name=item["full_name"],
                    phone_number=item.get("phone_number"),
                    role=item["role"],
                    status="ACTIVE",
                )
                db.add(user)
                db.flush()
            else:
                user.password_hash = hash_password(item["password"])
                user.full_name = item["full_name"]
                user.phone_number = item.get("phone_number")
                user.role = item["role"]
                user.status = "ACTIVE"

            account = db.query(Account).filter(Account.user_id == user.id).first()
            if account is None:
                account = Account(
                    user_id=user.id,
                    balance=item["balance"],
                    currency="VND",
                    status="ACTIVE",
                )
                db.add(account)
            else:
                account.balance = item["balance"]
                account.currency = "VND"
                account.status = "ACTIVE"

        db.commit()

        rows = (
            db.query(User, Account)
            .join(Account, Account.user_id == User.id)
            .order_by(User.id)
            .all()
        )
        print("Seeded users for testing:")
        print("-" * 110)
        print(f"{'user_id':<8} {'account_id':<10} {'username':<12} {'password':<10} {'phone':<15} {'role':<8} {'balance':>14}")
        print("-" * 110)
        passwords = {item["username"]: item["password"] for item in SEED_USERS}
        for user, account in rows:
            phone = user.phone_number or "N/A"
            print(
                f"{user.id:<8} {account.id:<10} {user.username:<12} "
                f"{passwords.get(user.username, ''):<10} {phone:<15} {user.role:<8} {float(account.balance):>14,.0f}"
            )
        print("-" * 110)
    finally:
        db.close()


if __name__ == "__main__":
    seed()
