CREATE DATABASE IF NOT EXISTS fraud_detection
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE fraud_detection;

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
);
