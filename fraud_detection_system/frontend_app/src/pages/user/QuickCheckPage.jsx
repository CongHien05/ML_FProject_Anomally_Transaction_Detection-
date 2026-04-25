import { useState } from 'react'
import Button from '../../components/Button'
import { predictQuick } from '../../services/api'
import './QuickCheckPage.css'

function QuickCheckPage() {
  const [amount, setAmount] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      const response = await predictQuick({ amount: parseFloat(amount) })
      setResult(response.data)
    } catch (err) {
      setError('Failed to check transaction. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="quick-check-page">
      <h1>Quick Fraud Check</h1>
      <p className="subtitle">Enter transaction amount for instant fraud assessment</p>
      
      <form onSubmit={handleSubmit} className="quick-form">
        <div className="input-group">
          <label htmlFor="amount">Transaction Amount ($)</label>
          <input
            id="amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g., 150.50"
            required
          />
        </div>
        
        <Button type="submit" variant="primary" loading={loading}>
          Check for Fraud
        </Button>
      </form>

      {error && <div className="error-message">{error}</div>}
      
      {result && (
        <div className={`result-card ${result.is_fraud ? 'fraud' : 'safe'}`}>
          <h3>{result.is_fraud ? '⚠️ Fraud Detected' : '✅ Transaction Safe'}</h3>
          <p>Fraud Probability: {(result.fraud_probability * 100).toFixed(2)}%</p>
          <p>Risk Level: {result.risk_level}</p>
        </div>
      )}
    </div>
  )
}

export default QuickCheckPage
