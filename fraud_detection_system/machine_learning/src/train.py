"""
Model training module for fraud detection.
Trains and saves a machine learning model.
"""

from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
from imblearn.over_sampling import SMOTE
import joblib
import os


def apply_smote(X_train, y_train):
    """Apply SMOTE to handle class imbalance."""
    smote = SMOTE(random_state=42)
    X_resampled, y_resampled = smote.fit_resample(X_train, y_train)
    print(f"After SMOTE: {X_resampled.shape[0]} samples")
    return X_resampled, y_resampled


def train_model(X_train, y_train, use_smote=True):
    """Train a Random Forest classifier."""
    if use_smote:
        X_train, y_train = apply_smote(X_train, y_train)
    
    # Initialize model
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        random_state=42,
        n_jobs=-1
    )
    
    # Train model
    print("Training model...")
    model.fit(X_train, y_train)
    print("Training completed!")
    
    return model


def evaluate_model(model, X_test, y_test):
    """Evaluate model performance."""
    y_pred = model.predict(X_test)
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    
    print("\n=== Model Evaluation ===")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, y_pred))
    
    auc_score = roc_auc_score(y_test, y_pred_proba)
    print(f"\nROC AUC Score: {auc_score:.4f}")
    
    return y_pred, y_pred_proba


def save_model(model, scaler, model_path="models/fraud_model.pkl", scaler_path="models/scaler.pkl"):
    """Save trained model and scaler."""
    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    
    joblib.dump(model, model_path)
    joblib.dump(scaler, scaler_path)
    
    print(f"Model saved to: {model_path}")
    print(f"Scaler saved to: {scaler_path}")


def main():
    """Main training pipeline."""
    from preprocess import preprocess_pipeline
    
    # Preprocess data
    X_train, X_test, y_train, y_test, scaler = preprocess_pipeline("data/transactions.csv")
    
    # Train model
    model = train_model(X_train, y_train, use_smote=True)
    
    # Evaluate model
    evaluate_model(model, X_test, y_test)
    
    # Save model
    save_model(model, scaler)


if __name__ == "__main__":
    main()
