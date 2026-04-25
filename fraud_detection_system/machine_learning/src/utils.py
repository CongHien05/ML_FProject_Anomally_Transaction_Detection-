"""
Utility functions for the ML module.
"""

import joblib
import pandas as pd
import numpy as np


def save_object(obj, filepath):
    """Save any Python object using joblib."""
    joblib.dump(obj, filepath)
    print(f"Object saved to: {filepath}")


def load_object(filepath):
    """Load a saved object using joblib."""
    obj = joblib.load(filepath)
    print(f"Object loaded from: {filepath}")
    return obj


def create_sample_data(filepath="data/transactions.csv", n_samples=1000):
    """Create sample transaction data for testing."""
    np.random.seed(42)
    
    data = {
        'transaction_amount': np.random.exponential(100, n_samples),
        'transaction_hour': np.random.randint(0, 24, n_samples),
        'merchant_risk_score': np.random.uniform(0, 1, n_samples),
        'customer_age_days': np.random.randint(1, 3650, n_samples),
        'transaction_count_24h': np.random.poisson(2, n_samples),
        'avg_transaction_amount_7d': np.random.exponential(100, n_samples),
        'is_international': np.random.choice([0, 1], n_samples, p=[0.9, 0.1]),
        'is_fraud': np.random.choice([0, 1], n_samples, p=[0.97, 0.03])
    }
    
    df = pd.DataFrame(data)
    df.to_csv(filepath, index=False)
    print(f"Sample data created: {filepath}")
    return df


def get_feature_names():
    """Return list of feature names expected by the model."""
    return [
        'transaction_amount',
        'transaction_hour',
        'merchant_risk_score',
        'customer_age_days',
        'transaction_count_24h',
        'avg_transaction_amount_7d',
        'is_international'
    ]


if __name__ == "__main__":
    # Create sample data for testing
    create_sample_data()
