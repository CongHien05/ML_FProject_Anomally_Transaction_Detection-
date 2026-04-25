"""
Data preprocessing module for fraud detection.
Handles loading, cleaning, and scaling of transaction data.
"""

import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import numpy as np


def load_data(filepath):
    """Load dataset from CSV file."""
    df = pd.read_csv(filepath)
    print(f"Data loaded: {df.shape[0]} rows, {df.shape[1]} columns")
    return df


def clean_data(df):
    """Basic data cleaning - handle missing values and duplicates."""
    # Remove duplicates
    df = df.drop_duplicates()
    
    # Handle missing values
    df = df.fillna(df.median(numeric_only=True))
    
    print(f"After cleaning: {df.shape[0]} rows, {df.shape[1]} columns")
    return df


def split_features_target(df, target_column='is_fraud'):
    """Separate features and target variable."""
    X = df.drop(columns=[target_column])
    y = df[target_column]
    return X, y


def scale_features(X_train, X_test):
    """Apply StandardScaler to features."""
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    return X_train_scaled, X_test_scaled, scaler


def preprocess_pipeline(filepath, target_column='is_fraud', test_size=0.2):
    """Complete preprocessing pipeline."""
    # Load data
    df = load_data(filepath)
    
    # Clean data
    df = clean_data(df)
    
    # Split features and target
    X, y = split_features_target(df, target_column)
    
    # Train-test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=42, stratify=y
    )
    
    # Scale features
    X_train_scaled, X_test_scaled, scaler = scale_features(X_train, X_test)
    
    print(f"Train set: {X_train_scaled.shape}, Test set: {X_test_scaled.shape}")
    
    return X_train_scaled, X_test_scaled, y_train, y_test, scaler


if __name__ == "__main__":
    # Example usage
    filepath = "data/transactions.csv"
    X_train, X_test, y_train, y_test, scaler = preprocess_pipeline(filepath)
