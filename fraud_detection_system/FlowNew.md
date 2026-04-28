# FRAUD TRANSACTION SYSTEM – FINAL DESIGN

---

## 1. DATABASE SCHEMA

### Bảng `users` — Xác thực & Phân quyền

* id
* username
* password_hash
* full_name
* role (USER, ADMIN)
* status (ACTIVE, BANNED)
* created_at

---

### Bảng `accounts` — Quản lý tài khoản

* id
* user_id (FK)
* balance
* currency (VND, USD)
* status (ACTIVE, FROZEN, CLOSED)
* created_at
* updated_at

**Lưu ý:**

* Khi update balance bắt buộc dùng DB transaction (BEGIN/COMMIT) hoặc SELECT FOR UPDATE để tránh race condition

---

### Bảng `transactions` — Core Banking

* id
* from_account (FK)
* to_account (FK)
* amount
* type (TRANSFER, CASH_OUT, PAYMENT, CASH_IN)
* note
* device_ip
* status (PENDING, PROCESSING, COMPLETED, FAILED, BLOCKED)
* created_at
* updated_at

---

### Bảng `fraud_predictions` — AI Domain

* id
* transaction_id (FK)
* risk_score (0–100)
* risk_level (LOW, MEDIUM, HIGH, CRITICAL)
* features_snapshot (JSON)
* model_version
* is_false_positive (BOOLEAN, default NULL)
* created_at
* updated_at

---

### Bảng `admin_reviews` — Audit

* id
* prediction_id (FK)
* admin_id (FK)
* action_taken (APPROVED, REJECTED, ACCOUNT_FROZEN, USER_BANNED)
* review_notes
* created_at

---

### Bảng `alerts` — Notification System

* id
* user_id
* transaction_id
* type (FRAUD_ALERT, SUSPICIOUS_ACTIVITY)
* message
* status (UNREAD, READ)
* created_at

---

## 2. WORKFLOW

### Khi User thực hiện giao dịch:

1. Pre-check (Sync)

* Kiểm tra số dư
* Kiểm tra account status
* Kiểm tra IP blacklist

→ Fail thì reject ngay

---

2. Tạo transaction

* status = PENDING

---

3. AI Predict (Sync < 200ms)

* Tính feature:

  * errorBalanceOrig
  * errorBalanceDest
* Gọi model → nhận risk_score

---

4. Decision Engine

* LOW (<40%)
  → BEGIN TRANSACTION
  → trừ tiền + cộng tiền
  → status = COMPLETED
  → COMMIT

* MEDIUM (40–75%)
  → status = PENDING
  → yêu cầu OTP
  → nếu không xác nhận trong 5 phút → FAILED

* HIGH (>75%)
  → status = BLOCKED
  → freeze account (nếu cần)
  → tạo alert cho admin

---

5. Async Tasks (Queue)

* Lưu log
* Gửi notification
* Gửi email/SMS

---

6. Admin Review

* Xem HIGH RISK
* XAI explanation
* Action:

  * APPROVE
  * REJECT
  * BAN USER
  * MARK FALSE POSITIVE

---

## 3. BACKEND DESIGN

* Tách module:

  * transaction service
  * ML service

* ML có thể:

  * Sync (đơn giản)
  * hoặc Async (scale lớn)

* Dùng queue:

  * Celery / Redis / Kafka

---

## 4. CONCURRENCY & SAFETY

* Dùng DB transaction (BEGIN/COMMIT)
* Hoặc SELECT FOR UPDATE khi update balance
* API phải idempotent (tránh double charge)

---

## 5. AUTHENTICATION

* JWT:

  * Access Token (~15 phút)
  * Refresh Token

* Middleware:

  * check role USER / ADMIN

---

## 6. FRONTEND FEATURES

### User

* Xem trạng thái giao dịch:

  * Processing / Completed / Pending / Failed
* OTP verification (có countdown)
* Transaction history

---

### Admin

* Realtime alert
* Fraud dashboard
* XAI explanation
* One-click action
* Thống kê:

  * risk level
  * fraud rate
  * false positive rate

---

## 7. ADVANCED (OPTIONAL)

* Device fingerprint (không chỉ IP)
* Rule + ML hybrid
* User risk profile tracking
* Explainable AI nâng cao
