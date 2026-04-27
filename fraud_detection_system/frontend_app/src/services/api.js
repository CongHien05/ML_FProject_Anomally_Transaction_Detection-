/**
 * Real API client for the Fraud Detection FastAPI backend.
 *
 * Base URL is read from the Vite environment variable VITE_API_URL.
 * Default: http://localhost:8000
 *
 * To override, create a .env file in frontend_app/ with:
 *   VITE_API_URL=http://your-server:8000
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
