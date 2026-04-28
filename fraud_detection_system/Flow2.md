# FRAUD DETECTION SYSTEM – FINAL DESIGN (LEAN VERSION)

---

## 1. DATABASE SCHEMA

### 1. `users`

* id
* username
* password_hash
* pin_hash
* role (USER, ADMIN)
* status (ACTIVE, BANNED)
* created_at

---

### 2. `accounts`

* id
* user_id (FK)
* balance
* currency
* status (ACTIVE, FROZEN)
* created_at

---

### 3. `transactions`

* id
* request_id (UUID, chống duplicate request)
* from_account_id (FK, nullable)
* to_account_id (FK, nullable)
* amount
* type (TRANSFER, CASH_IN, CASH_OUT)
* status (PENDING, PROCESSING, COMPLETED, FAILED, BLOCKED)
* created_at
* updated_at

---

### 4. `fraud_predictions`

* id
* transaction_id (FK)
* risk_score
* risk_level (LOW, MEDIUM, HIGH, CRITICAL)
* explanations (JSON)
* review_status (PENDING, CONFIRMED_FRAUD, FALSE_POSITIVE)
* reviewed_by (admin_id)
* review_note
* created_at
* updated_at

---

## 2. CORE PRINCIPLE (SECURITY)

* ❌ Không bao giờ tin dữ liệu từ Frontend (balance, feature)
* ✅ Backend phải tự query DB để lấy số dư thật
* ✅ Tính toán feature ở Backend trước khi đưa vào model

---

## 3. WORKFLOW

### Step 1 – User Request

Frontend gửi:

```json
{
  "request_id": "uuid",
  "from_account_id": 1,
  "to_account_id": 2,
  "amount": 500000,
  "type": "TRANSFER"
}
```

---

### Step 2 – Backend Fetch (Secure)

* Query DB:

  * oldbalanceOrg
  * oldbalanceDest
* Tính:

  * newbalanceOrig
  * newbalanceDest

---

### Step 3 – Feature Engineering

* errorBalanceOrig
* errorBalanceDest

---

### Step 4 – AI Predict (Sync)

* Model đã load sẵn khi app start
* Input → Random Forest
* Output → risk_score

---

### Step 5 – Ghi DB

* Insert `transactions` (status = PROCESSING)
* Insert `fraud_predictions`

---

### Step 6 – Decision Engine

#### 🟢 LOW (<40%)

* BEGIN TRANSACTION
* Check lại balance
* Trừ tiền / cộng tiền
* status = COMPLETED
* COMMIT

---

#### 🟡 MEDIUM (40–75%)

* status = PENDING
* Yêu cầu nhập PIN/OTP

👉 Sau khi xác nhận:

* Check lại balance
* Nếu đủ → COMPLETED
* Nếu không → FAILED

👉 Timeout:

* Sau 5 phút không xác nhận → FAILED

---

#### 🟠 HIGH (75–90%)

* status = BLOCKED
* Không thực hiện giao dịch
* Chờ Admin review

---

#### 🔴 CRITICAL (>90%)

* status = BLOCKED
* Update account → FROZEN
* Khóa tài khoản

---

### Step 7 – Admin Review

Admin xử lý trong `fraud_predictions`:

* CONFIRMED_FRAUD
* FALSE_POSITIVE

---

## 4. CONCURRENCY & SAFETY

* Dùng DB transaction (BEGIN / COMMIT)
* Hoặc SELECT FOR UPDATE
* Luôn check lại balance trước khi trừ tiền
* request_id để tránh double transaction

---

## 5. MACHINE LEARNING (IMPORTANT)

* Giữ nguyên feature của dataset PaySim
* Không thêm feature mới nếu chưa retrain model

Feature chính:

* oldbalanceOrg
* newbalanceOrig
* oldbalanceDest
* newbalanceDest
* errorBalanceOrig
* errorBalanceDest

---

## 6. BACKEND NOTES

* Model load 1 lần khi start app (không load mỗi request)
* Tách module:

  * transaction service
  * ML service
* Có thể thêm async cho logging sau này

---

## 7. SCOPE

* Thiết kế tối ưu cho team 2 người
* Không over-engineering
* Đủ để demo + giải thích như system thật
