"""
model.py
--------
Model interface for the Novelty Detection System.
Handles loading the trained Isolation Forest model and making predictions.
"""

import joblib
import numpy as np
import os

# Path to the saved model
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model", "novelty_model.pkl")


def load_model():
    """
    Load the pre-trained Isolation Forest model from disk.

    Returns:
        sklearn.ensemble.IsolationForest: Loaded model object.

    Raises:
        FileNotFoundError: If the model file does not exist.
    """
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            f"Model not found at '{MODEL_PATH}'. "
            "Please run 'python train_model.py' first to train and save the model."
        )
    model = joblib.load(MODEL_PATH)
    print("[Model] Isolation Forest model loaded successfully.")
    return model


def predict(model, temperature, pressure, vibration, speed):
    """
    Run novelty detection on the provided input features.

    The Isolation Forest returns:
        +1 → Normal (inlier)
        -1 → Novel/Unusual (outlier)

    The decision_function score is more negative for outliers.

    Args:
        model       : Trained IsolationForest model
        temperature (float): Input temperature
        pressure    (float): Input pressure
        vibration   (float): Input vibration
        speed       (float): Input speed

    Returns:
        dict: {
            "prediction" (str):   'Normal' or 'Novel/Unusual'
            "status"     (str):   'normal' or 'novel'
            "score"      (float): Anomaly score (decision_function output)
            "message"    (str):   Human-readable result message
        }
    """
    # Build feature array — shape (1, 4)
    features = np.array([[temperature, pressure, vibration, speed]])

    # IsolationForest predict: +1 = inlier, -1 = outlier
    raw_prediction = model.predict(features)[0]

    # Anomaly score: more negative = more anomalous
    score = float(round(model.decision_function(features)[0], 4))

    if raw_prediction == 1:
        return {
            "prediction": "Normal",
            "status": "normal",
            "score": score,
            "message": "The input data follows the learned normal pattern. No anomaly detected."
        }
    else:
        return {
            "prediction": "Novel/Unusual",
            "status": "novel",
            "score": score,
            "message": "A previously unseen or unusual pattern has been detected. This may require attention."
        }
