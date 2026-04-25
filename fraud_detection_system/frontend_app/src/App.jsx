import React, { useState, useEffect } from 'react';
import TransactionForm from './components/TransactionForm';
import './App.css';

function App() {
  const [result, setResult] = useState(null);
  const [backendStatus, setBackendStatus] = useState('checking');

  useEffect(() => {
    checkBackendStatus();
  }, []);

  const checkBackendStatus = async () => {
    try {
      const response = await fetch('http://localhost:8000/health');
      setBackendStatus(response.ok ? 'online' : 'offline');
    } catch {
      setBackendStatus('offline');
    }
  };

  const handleResult = (predictionResult) => {
    setResult(predictionResult);
  };

  const getRiskClass = (riskLevel) => {
    switch (riskLevel) {
      case 'high': return 'risk-high';
      case 'medium': return 'risk-medium';
      case 'low': return 'risk-low';
      default: return '';
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Fraud Detection System</h1>
        <div className={`status-badge ${backendStatus}`}>
          Backend: {backendStatus}
        </div>
      </header>

      <main className="App-main">
        <TransactionForm onResult={handleResult} />

        {result && (
          <div className="result-container">
            <h2>Prediction Result</h2>
            
            <div className={`result-card ${result.is_fraud ? 'fraud' : 'legitimate'}`}>
              <div className="result-status">
                {result.is_fraud ? '⚠️ FRAUD DETECTED' : '✅ LEGITIMATE TRANSACTION'}
              </div>
              
              <div className="result-details">
                <div className="detail-row">
                  <span className="label">Fraud Probability:</span>
                  <span className="value">{(result.fraud_probability * 100).toFixed(2)}%</span>
                </div>
                
                <div className="detail-row">
                  <span className="label">Risk Level:</span>
                  <span className={`value risk-badge ${getRiskClass(result.risk_level)}`}>
                    {result.risk_level.toUpperCase()}
                  </span>
                </div>
              </div>
              
              <div className="result-message">
                {result.message}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="App-footer">
        <p>Fraud Detection System - Machine Learning Project</p>
      </footer>
    </div>
  );
}

export default App;
