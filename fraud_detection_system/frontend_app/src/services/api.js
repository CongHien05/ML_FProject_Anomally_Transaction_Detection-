/**
 * Real API client for the Fraud Detection FastAPI backend.
 *
 * Base URL is read from the Vite environment variable VITE_API_URL.
 * Default: http://localhost:8000
 *
 * To override, create a .env file in frontend_app/ with:
 *   VITE_API_URL=http://your-server:8000
 */

import { parseVndAmount } from './auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const authHeaders = (withJson = false) => {
  const token = localStorage.getItem('access_token');
  return {
    ...(withJson ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const readError = async (response, fallback) => {
  const err = await response.json().catch(() => ({}));
  return new Error(err.detail || `${fallback}: ${response.status}`);
};

/**
 * Check whether the backend is reachable.
 * @returns {Promise<boolean>}
 */
export const checkHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
};

export const login = async ({ username, password }) => {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Login failed: ${response.status}`);
  }

  return response.json();
};

export const getCurrentUser = async () => {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw await readError(response, 'Auth error');
  }

  return response.json();
};

export const getAdminAlerts = async () => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/alerts`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw await readError(response, 'Load alerts failed');
  }

  return response.json();
};

export const markAdminAlertRead = async (alertId) => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/alerts/${alertId}/read`, {
    method: 'PATCH',
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw await readError(response, 'Update alert failed');
  }

  return response.json();
};

/**
 * Submit a full PaySim-format transaction for advanced fraud prediction.
 *
 * @param {Object} data - Transaction fields:
 *   { step, type, amount, oldbalanceOrg, newbalanceOrig, oldbalanceDest, newbalanceDest }
 * @returns {Promise<{ status: string, data: Object }>}
 * @throws {Error} when the server is unreachable or returns a non-OK status
 */
export const searchUserByUsername = async (username) => {
  const response = await fetch(`${API_BASE_URL}/api/v1/users/search?username=${encodeURIComponent(username)}`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw await readError(response, 'User not found');
  }

  return response.json();
};

export const createTransaction = async (data) => {
  const amount = typeof data.amount === 'number' ? data.amount : parseVndAmount(data.amount);

  const response = await fetch(`${API_BASE_URL}/api/v1/transactions`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({
      request_id: `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      from_account_id: data.from_account_id,
      to_account_id: data.to_account_id,
      amount,
      type: data.type || 'TRANSFER',
      note: data.note || null,
      device_ip: data.device_ip || null,
    }),
  });

  if (!response.ok) {
    throw await readError(response, 'Transaction failed');
  }

  return response.json();
};

export const verifyTransactionOtp = async ({ transactionId, phoneNumber, otpCode }) => {
  const response = await fetch(`${API_BASE_URL}/api/v1/transactions/${transactionId}/verify-otp`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({ phone_number: phoneNumber, otp_code: otpCode }),
  });

  if (!response.ok) {
    throw await readError(response, 'OTP verification failed');
  }

  return response.json();
};

export const requestPhoneOtp = async (phoneNumber) => {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/phone/request-otp`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({ phone_number: phoneNumber }),
  });

  if (!response.ok) {
    throw await readError(response, 'Request OTP failed');
  }

  return response.json();
};

export const verifyPhoneOtp = async (phoneNumber, otpCode) => {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/phone/verify-otp`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({ phone_number: phoneNumber, otp_code: otpCode }),
  });

  if (!response.ok) {
    throw await readError(response, 'Phone OTP verification failed');
  }

  return response.json();
};

export const requestTransactionOtp = async (phoneNumber) => {
  const response = await fetch(`${API_BASE_URL}/api/v1/transactions/request-otp`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({ phone_number: phoneNumber }),
  });

  if (!response.ok) {
    throw await readError(response, 'Request transaction OTP failed');
  }

  return response.json();
};

export const getMyTransactions = async () => {
  const response = await fetch(`${API_BASE_URL}/api/v1/transactions/me`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw await readError(response, 'Load transactions failed');
  }

  return response.json();
};

export const getAdminDashboard = async () => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/dashboard`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw await readError(response, 'Load dashboard failed');
  }

  return response.json();
};

export const getAllTransactions = async () => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/transactions`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw await readError(response, 'Load all transactions failed');
  }

  return response.json();
};

export const getAdminFraudPredictions = async () => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/fraud-predictions`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw await readError(response, 'Load fraud predictions failed');
  }

  return response.json();
};

export const reviewFraudPrediction = async ({ predictionId, actionTaken, reviewNotes }) => {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/fraud-predictions/${predictionId}/review`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({
      action_taken: actionTaken,
      review_notes: reviewNotes || null,
    }),
  });

  if (!response.ok) {
    throw await readError(response, 'Review action failed');
  }

  return response.json();
};

export const predictTransaction = async (data) => {
  const response = await fetch(`${API_BASE_URL}/api/v1/predict/advanced`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      step:            Number(data.step)            || 1,
      type:            data.type                   || '',
      amount:          Number(data.amount)          || 0,
      oldbalanceOrg:   Number(data.oldbalanceOrg)   || 0,
      newbalanceOrig:  Number(data.newbalanceOrig)  || 0,
      oldbalanceDest:  Number(data.oldbalanceDest)  || 0,
      newbalanceDest:  Number(data.newbalanceDest)  || 0,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Server error: ${response.status}`);
  }

  const result = await response.json();

  // Wrap in the same envelope shape mockApi uses so UI components need no changes
  return { status: 'success', data: result };
};
