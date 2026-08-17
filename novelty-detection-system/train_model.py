"""
train_model.py
--------------
Script to:
1. Generate a synthetic dataset (normal + anomalous observations).
2. Save the dataset to data/dataset.csv.
3. Train an Isolation Forest model on the normal data.
4. Save the trained model to model/novelty_model.pkl.

Run this file ONCE before starting the Flask application:
    python train_model.py
"""

import os
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
import joblib

# ──────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ──────────────────────────────────────────────────────────────────────────────
DATASET_PATH = os.path.join(os.path.dirname(__file__), "data", "dataset.csv")
MODEL_PATH   = os.path.join(os.path.dirname(__file__), "model", "novelty_model.pkl")

NORMAL_SAMPLES   = 950    # Normal observations
ANOMALY_SAMPLES  = 50     # Anomalous observations (not used in training)
RANDOM_STATE     = 42
CONTAMINATION    = 0.05   # Expected fraction of outliers in training data

# Normal feature ranges
NORMAL_TEMP_RANGE       = (20, 30)
NORMAL_PRESSURE_RANGE   = (90, 110)
NORMAL_VIBRATION_RANGE  = (1, 5)
NORMAL_SPEED_RANGE      = (40, 70)

# Anomalous feature ranges
ANOMALY_TEMP_RANGE      = (70, 100)
ANOMALY_PRESSURE_RANGE  = (150, 200)
ANOMALY_VIBRATION_RANGE = (15, 30)
ANOMALY_SPEED_RANGE     = (100, 150)


# ──────────────────────────────────────────────────────────────────────────────
# STEP 1: Generate Synthetic Dataset
# ──────────────────────────────────────────────────────────────────────────────
def generate_dataset():
    """Generate a synthetic dataset with normal and anomalous samples."""
    rng = np.random.default_rng(RANDOM_STATE)

    print("[Data] Generating normal samples...")
    normal_data = {
        "temperature": rng.uniform(*NORMAL_TEMP_RANGE,       NORMAL_SAMPLES),
        "pressure":    rng.uniform(*NORMAL_PRESSURE_RANGE,   NORMAL_SAMPLES),
        "vibration":   rng.uniform(*NORMAL_VIBRATION_RANGE,  NORMAL_SAMPLES),
        "speed":       rng.uniform(*NORMAL_SPEED_RANGE,      NORMAL_SAMPLES),
        "label":       ["Normal"] * NORMAL_SAMPLES,
    }

    print("[Data] Generating anomalous samples...")
    anomaly_data = {
        "temperature": rng.uniform(*ANOMALY_TEMP_RANGE,       ANOMALY_SAMPLES),
        "pressure":    rng.uniform(*ANOMALY_PRESSURE_RANGE,   ANOMALY_SAMPLES),
        "vibration":   rng.uniform(*ANOMALY_VIBRATION_RANGE,  ANOMALY_SAMPLES),
        "speed":       rng.uniform(*ANOMALY_SPEED_RANGE,      ANOMALY_SAMPLES),
        "label":       ["Novel/Unusual"] * ANOMALY_SAMPLES,
    }

    df_normal  = pd.DataFrame(normal_data)
    df_anomaly = pd.DataFrame(anomaly_data)
    df = pd.concat([df_normal, df_anomaly], ignore_index=True).sample(
        frac=1, random_state=RANDOM_STATE
    ).reset_index(drop=True)

    # Round to 2 decimal places for readability
    for col in ["temperature", "pressure", "vibration", "speed"]:
        df[col] = df[col].round(2)

    return df


# ──────────────────────────────────────────────────────────────────────────────
# STEP 2: Train Isolation Forest
# ──────────────────────────────────────────────────────────────────────────────
def train_model(df):
    """
    Train an Isolation Forest on the NORMAL samples only.

    Isolation Forest is an unsupervised algorithm — it learns what 'normal'
    looks like and assigns anomaly scores to new data points. Points that
    are harder to isolate (require more splits) are considered normal;
    points that are easier to isolate are flagged as anomalies.

    Args:
        df (pd.DataFrame): Full dataset including anomaly rows.

    Returns:
        sklearn.ensemble.IsolationForest: Fitted model.
    """
    features = ["temperature", "pressure", "vibration", "speed"]

    # Train ONLY on normal samples (unsupervised novelty detection)
    X_train = df[df["label"] == "Normal"][features].values

    print(f"[Model] Training Isolation Forest on {len(X_train)} normal samples...")
    model = IsolationForest(
        n_estimators=100,
        contamination=CONTAMINATION,
        random_state=RANDOM_STATE,
        max_samples="auto"
    )
    model.fit(X_train)
    print("[Model] Training complete.")
    return model


# ──────────────────────────────────────────────────────────────────────────────
# STEP 3: Save Dataset and Model
# ──────────────────────────────────────────────────────────────────────────────
def save_artifacts(df, model):
    """Save the dataset CSV and the trained model pkl file."""
    os.makedirs(os.path.dirname(DATASET_PATH), exist_ok=True)
    df.to_csv(DATASET_PATH, index=False)
    print(f"[Data] Dataset saved to '{DATASET_PATH}' ({len(df)} rows).")

    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    print(f"[Model] Model saved to '{MODEL_PATH}'.")


# ──────────────────────────────────────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 55)
    print("  Novelty Detection System -- Model Training")
    print("=" * 55)

    df    = generate_dataset()
    model = train_model(df)
    save_artifacts(df, model)

    # Quick validation on a known normal input
    import numpy as np
    X_normal  = np.array([[25, 100, 3, 55]])
    X_unusual = np.array([[90, 180, 25, 130]])

    pred_n = model.predict(X_normal)[0]
    pred_u = model.predict(X_unusual)[0]
    print(f"\n[Validation] Normal  input -> IsolationForest: {'+1 (Normal)' if pred_n == 1 else '-1 (Anomaly)'}")
    print(f"[Validation] Unusual input -> IsolationForest: {'+1 (Normal)' if pred_u == 1 else '-1 (Anomaly)'}")

    print("\n[Done] Training complete. You can now start the Flask app with: python app.py")
    print("=" * 55)

