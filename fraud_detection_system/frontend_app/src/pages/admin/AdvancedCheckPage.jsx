import { useState } from 'react'
import Button from '../../components/Button'
import { predictAdvanced } from '../../services/api'
import './AdvancedCheckPage.css'

function AdvancedCheckPage() {
  const [formData, setFormData] = useState({
    transaction_amount: '',
    transaction_hour: '',
    merchant_risk_score: '',
    customer_age_days: '',
    transaction_count_24h: '',
    avg_transaction_amount_7d: '',
    is_international: 0
  })
  
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || '' : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      const dataToSend = {
        ...formData,
        is_international: parseInt(formData.is_international)
      }
      const response = await predictAdvanced(dataToSend)
      setResult(response.data)
    } catch (err) {
      setError('Failed to analyze transaction. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="advanced-check-page">
      <h1>Advanced Fraud Analysis</h1>
      <p className="subtitle">Comprehensive transaction analysis with detailed features</p>
      
      <form onSubmit={handleSubmit} className="advanced-form">
        <div className="form-grid">
          <div className="input-group">
            <label>Transaction Amount ($)</label>
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

          <div className="input-group">
            <label>Transaction Hour (0-23)</label>
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

          <div className="input-group">
            <label>Merchant Risk Score (0-1)</label>
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

          <div className="input-group">
            <label>Customer Age (days)</label>
            <input
              type="number"
              name="customer_age_days"
              value={formData.customer_age_days}
              onChange={handleChange}
              min="1"
              required
            />
          </div>

          <div className="input-group">
            <label>Tx Count (24h)</label>
            <input
              type="number"
              name="transaction_count_24h"
              value={formData.transaction_count_24h}
              onChange={handleChange}
              min="0"
              required
            />
          </div>

          <div className="input-group">
            <label>Avg Amount (7d)</label>
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

          <div className="input-group full-width">
            <label>International Transaction</label>
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
        </div>
        
        <Button type="submit" variant="primary" loading={loading}>
          Analyze Transaction
        </Button>
      </form>

      {error && <div className="error-message">{error}</div>}
      
      {result && (
        <div className={`result-card ${result.is_fraud ? 'fraud' : 'safe'}`}>
          <h3>{result.is_fraud ? '⚠️ Fraud Detected' : '✅ Transaction Safe'}</h3>
          <div className="result-details">
            <p><strong>Fraud Probability:</strong> {(result.fraud_probability * 100).toFixed(2)}%</p>
            <p><strong>Risk Level:</strong> <span className={`risk-${result.risk_level}`}>{result.risk_level}</span></p>
            <p><strong>Message:</strong> {result.message}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdvancedCheckPage
