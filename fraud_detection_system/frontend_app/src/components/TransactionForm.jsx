import React, { useState } from 'react';
import { predictTransaction } from '../services/api';

const TransactionForm = ({ onResult }) => {
  const [formData, setFormData] = useState({
    transaction_amount: '',
    transaction_hour: '',
    merchant_risk_score: '',
    customer_age_days: '',
    transaction_count_24h: '',
    avg_transaction_amount_7d: '',
    is_international: 0
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || '' : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Convert is_international to integer
      const dataToSend = {
        ...formData,
        is_international: parseInt(formData.is_international)
      };
      
      const result = await predictTransaction(dataToSend);
      onResult(result);
    } catch (err) {
      setError(err.message || 'Failed to get prediction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="transaction-form">
      <h2>Transaction Details</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Transaction Amount ($):</label>
          <input
            type="number"
            name="transaction_amount"
            value={formData.transaction_amount}
            onChange={handleChange}
            step="0.01"
            min="0"
            required
          />
        </div>

        <div className="form-group">
          <label>Transaction Hour (0-23):</label>
          <input
            type="number"
            name="transaction_hour"
            value={formData.transaction_hour}
            onChange={handleChange}
            min="0"
            max="23"
            required
          />
        </div>

        <div className="form-group">
          <label>Merchant Risk Score (0-1):</label>
          <input
            type="number"
            name="merchant_risk_score"
            value={formData.merchant_risk_score}
            onChange={handleChange}
            step="0.01"
            min="0"
            max="1"
            required
          />
        </div>

        <div className="form-group">
          <label>Customer Account Age (days):</label>
          <input
            type="number"
            name="customer_age_days"
            value={formData.customer_age_days}
            onChange={handleChange}
            min="1"
            required
          />
        </div>

        <div className="form-group">
          <label>Transactions in Last 24h:</label>
          <input
            type="number"
            name="transaction_count_24h"
            value={formData.transaction_count_24h}
            onChange={handleChange}
            min="0"
            required
          />
        </div>

        <div className="form-group">
          <label>Avg Transaction Amount (7 days) ($):</label>
          <input
            type="number"
            name="avg_transaction_amount_7d"
            value={formData.avg_transaction_amount_7d}
            onChange={handleChange}
            step="0.01"
            min="0"
            required
          />
        </div>

        <div className="form-group">
          <label>International Transaction:</label>
          <select
            name="is_international"
            value={formData.is_international}
            onChange={handleChange}
            required
          >
            <option value={0}>No</option>
            <option value={1}>Yes</option>
          </select>
        </div>

        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? 'Analyzing...' : 'Check for Fraud'}
        </button>
      </form>
    </div>
  );
};

export default TransactionForm;
