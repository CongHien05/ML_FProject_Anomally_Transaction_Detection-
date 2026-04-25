# Fraud Detection System

A complete Machine Learning system for detecting fraudulent transactions, built as a monorepo with three modules: ML training pipeline, FastAPI backend, and React frontend.

## Project Structure

```
fraud_detection_system/
├── machine_learning/     # ML model training module
│   ├── data/            # Dataset storage
│   ├── notebooks/       # Jupyter notebooks for exploration
│   ├── src/            # Source code
│   │   ├── preprocess.py   # Data preprocessing
│   │   ├── train.py        # Model training
│   │   └── utils.py        # Helper functions
│   ├── models/         # Saved model files
│   └── requirements_ml.txt
│
├── backend_api/         # FastAPI backend service
│   ├── main.py         # FastAPI application
│   ├── schemas.py      # Pydantic models
│   ├── ml_services.py  # ML prediction service
│   └── requirements.txt
│
├── frontend_app/        # React frontend application
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   └── TransactionForm.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   └── App.css
│   └── package.json
│
└── README.md
```

## Features

- **Machine Learning**: Random Forest classifier with SMOTE for handling imbalanced data
- **REST API**: FastAPI backend with `/predict` endpoint
- **Web UI**: React frontend for submitting transactions and viewing results
- **Preprocessing**: Standard scaling and feature engineering

## Quick Start

### 1. Train the Model

```bash
cd machine_learning

# Install dependencies
pip install -r requirements_ml.txt

# Create sample data and train model
cd src
python utils.py        # Generate sample data
python train.py        # Train and save model
```

### 2. Start the Backend

```bash
cd backend_api

# Install dependencies
pip install -r requirements.txt

# Run the API server
python main.py
```

The API will be available at `http://localhost:8000`

API documentation: `http://localhost:8000/docs`

### 3. Start the Frontend

```bash
cd frontend_app

# Install dependencies
npm install

# Start development server
npm start
```

The React app will be available at `http://localhost:3000`

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check - API status |
| `/health` | GET | Health check endpoint |
| `/predict` | POST | Predict fraud for a transaction |

### Predict Endpoint Example

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_amount": 150.50,
    "transaction_hour": 14,
    "merchant_risk_score": 0.3,
    "customer_age_days": 365,
    "transaction_count_24h": 2,
    "avg_transaction_amount_7d": 120.0,
    "is_international": 0
  }'
```

## Input Features

| Feature | Type | Description |
|---------|------|-------------|
| transaction_amount | float | Transaction amount in dollars |
| transaction_hour | int | Hour of day (0-23) |
| merchant_risk_score | float | Merchant risk score (0-1) |
| customer_age_days | int | Account age in days |
| transaction_count_24h | int | Transactions in last 24h |
| avg_transaction_amount_7d | float | Average amount last 7 days |
| is_international | int | 1 if international, 0 otherwise |

## Requirements

### Machine Learning Module
- pandas >= 1.5.0
- scikit-learn >= 1.3.0
- matplotlib >= 3.7.0
- seaborn >= 0.12.0
- imbalanced-learn >= 0.11.0
- joblib >= 1.3.0

### Backend API
- fastapi >= 0.104.0
- uvicorn >= 0.24.0
- pydantic >= 2.5.0
- scikit-learn >= 1.3.0
- pandas >= 2.0.0
- joblib >= 1.3.0
- imbalanced-learn >= 0.11.0
- numpy >= 1.24.0

### Frontend App
- Node.js >= 16.x
- React >= 18.2.0

## How It Works

1. **Data Preprocessing**: Raw transaction data is cleaned, scaled using StandardScaler, and split into train/test sets
2. **Model Training**: Random Forest with SMOTE oversampling to handle class imbalance
3. **Prediction**: Trained model loads via API and returns fraud probability and risk level
4. **Visualization**: React frontend displays prediction results with color-coded risk indicators

## Development Notes

- The ML model is saved using joblib in `machine_learning/models/`
- Backend expects model files at relative path `../machine_learning/models/`
- Frontend uses proxy configuration to route API calls to backend

## License

This project is for educational purposes.
