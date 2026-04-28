/**
 * Real API client for the Fraud Detection FastAPI backend.
 *
 * Base URL is read from the Vite environment variable VITE_API_URL.
 * Default: http://localhost:8000
 *
 * To override, create a .env file in frontend_app/ with:
 *   VITE_API_URL=http://your-server:8000
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const requestJson = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, options);

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Server error: ${response.status}`);
  }

  return response.json();
};

const normalizeLog = (log) => ({
  id: log.id,
  transactionId: log.transaction_id,
  time: log.time,
  step: log.step,
  type: log.type,
  amount: Number(log.amount) || 0,
  oldbalanceOrg: Number(log.oldbalanceOrg) || 0,
  newbalanceOrig: Number(log.newbalanceOrig) || 0,
  oldbalanceDest: Number(log.oldbalanceDest) || 0,
  newbalanceDest: Number(log.newbalanceDest) || 0,
  riskScore: Number(log.risk_score) || 0,
  riskLevel: log.risk_level,
  isFraud: Boolean(log.is_fraud),
  reviewStatus: log.review_status,
  reviewNote: log.review_note,
  modelVersion: log.model_version,
  explanations: log.explanations || [],
});

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

/**
 * Submit a full PaySim-format transaction for advanced fraud prediction.
 *
 * @param {Object} data - Transaction fields:
 *   { step, type, amount, oldbalanceOrg, newbalanceOrig, oldbalanceDest, newbalanceDest }
 * @returns {Promise<{ status: string, data: Object }>}
 * @throws {Error} when the server is unreachable or returns a non-OK status
 */
export const predictTransaction = async (data) => {
  const result = await requestJson("/api/v1/predict/advanced", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      step: Number(data.step) || 1,
      type: data.type || "",
      amount: Number(data.amount) || 0,
      oldbalanceOrg: Number(data.oldbalanceOrg) || 0,
      newbalanceOrig: Number(data.newbalanceOrig) || 0,
      oldbalanceDest: Number(data.oldbalanceDest) || 0,
      newbalanceDest: Number(data.newbalanceDest) || 0,
    }),
  });

  // Wrap in the same envelope shape mockApi uses so UI components need no changes
  return {
    status: "success",
    data: {
      logId: result.log_id,
      riskScore: result.risk_score,
      riskLevel: result.risk_level,
      fraudProbability: result.risk_score / 100,
      isFraud: result.risk_level === "High",
      explanations: result.explanations,
    },
  };
};

export const fetchTransactionLogs = async ({
  page = 1,
  limit = 10,
  risk = "all",
  txType = "all",
  search = "",
} = {}) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (risk && risk !== "all") params.set("risk", risk);
  if (txType && txType !== "all") params.set("tx_type", txType);
  if (search) params.set("search", search);

  const result = await requestJson(`/api/v1/admin/logs?${params.toString()}`);

  return {
    ...result,
    items: (result.items || []).map(normalizeLog),
  };
};

export const fetchDashboardSummary = async () => {
  const result = await requestJson("/api/v1/admin/dashboard/summary");

  return {
    ...result,
    recentAlerts: (result.recent_alerts || []).map(normalizeLog),
    riskDistribution: result.risk_distribution || [],
    weeklyData: result.weekly_data || [],
    modelMetrics: result.model_metrics || [],
  };
};

export const fetchModelInfo = async () => {
  return requestJson("/api/v1/admin/model/info");
};

export const updateLogReview = async (logId, { reviewStatus, reviewNote }) => {
  return requestJson(`/api/v1/admin/logs/${logId}/review`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      review_status: reviewStatus,
      review_note: reviewNote || "",
    }),
  });
};
