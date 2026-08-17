"""
app.py
------
Flask application for the Novelty Detection System.

Endpoints:
    GET  /                  → Serve index.html
    GET  /dashboard         → Serve dashboard.html
    GET  /history           → Serve history.html
    POST /api/predict       → Run novelty detection on input data
    GET  /api/statistics    → Return prediction summary statistics
    GET  /api/history       → Return all past predictions
    GET  /api/chart-data    → Return chart data for visualisations
    DELETE /api/history     → Delete all prediction history
"""

from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import os

import database
import model as ml_model

# ──────────────────────────────────────────────────────────────────────────────
# APP SETUP
# ──────────────────────────────────────────────────────────────────────────────
app = Flask(__name__, template_folder="templates", static_folder="static")
CORS(app)   # Allow cross-origin requests (useful during development)

# Initialise SQLite database on startup
database.init_db()

# Load the trained Isolation Forest model once at startup
try:
    _model = ml_model.load_model()
except FileNotFoundError as e:
    print(f"[WARNING] {e}")
    _model = None


# ──────────────────────────────────────────────────────────────────────────────
# PAGE ROUTES
# ──────────────────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/dashboard")
def dashboard():
    return render_template("dashboard.html")


@app.route("/history")
def history():
    return render_template("history.html")


# ──────────────────────────────────────────────────────────────────────────────
# API: POST /api/predict
# ──────────────────────────────────────────────────────────────────────────────

@app.route("/api/predict", methods=["POST"])
def predict():
    """
    Receive sensor data, validate it, run the Isolation Forest model,
    store the result in SQLite, and return a JSON response.
    """
    if _model is None:
        return jsonify({
            "error": "Model not loaded. Please run 'python train_model.py' first."
        }), 503

    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "Invalid JSON payload."}), 400

    # ── Validate required fields ──────────────────────────────────────────────
    required = ["temperature", "pressure", "vibration", "speed"]
    missing  = [f for f in required if f not in data]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

    # ── Parse and type-check ──────────────────────────────────────────────────
    try:
        temperature = float(data["temperature"])
        pressure    = float(data["pressure"])
        vibration   = float(data["vibration"])
        speed       = float(data["speed"])
    except (ValueError, TypeError):
        return jsonify({"error": "All input values must be numeric."}), 400

    # ── Range validation ──────────────────────────────────────────────────────
    errors = []
    if not (-50 <= temperature <= 500):
        errors.append("Temperature must be between -50 and 500.")
    if not (0 <= pressure <= 1000):
        errors.append("Pressure must be between 0 and 1000.")
    if not (0 <= vibration <= 500):
        errors.append("Vibration must be between 0 and 500.")
    if not (0 <= speed <= 500):
        errors.append("Speed must be between 0 and 500.")
    if errors:
        return jsonify({"error": " | ".join(errors)}), 400

    # ── Predict ───────────────────────────────────────────────────────────────
    result = ml_model.predict(_model, temperature, pressure, vibration, speed)

    # ── Persist to DB ─────────────────────────────────────────────────────────
    database.insert_prediction(
        temperature=temperature,
        pressure=pressure,
        vibration=vibration,
        speed=speed,
        prediction=result["prediction"],
        score=result["score"]
    )

    # ── Return response ───────────────────────────────────────────────────────
    return jsonify({
        "prediction": result["prediction"],
        "status":     result["status"],
        "score":      result["score"],
        "message":    result["message"],
        "inputs": {
            "temperature": temperature,
            "pressure":    pressure,
            "vibration":   vibration,
            "speed":       speed
        }
    }), 200


# ──────────────────────────────────────────────────────────────────────────────
# API: GET /api/statistics
# ──────────────────────────────────────────────────────────────────────────────

@app.route("/api/statistics", methods=["GET"])
def statistics():
    """Return summary statistics about stored predictions."""
    stats = database.get_statistics()
    return jsonify(stats), 200


# ──────────────────────────────────────────────────────────────────────────────
# API: GET /api/history
# ──────────────────────────────────────────────────────────────────────────────

@app.route("/api/history", methods=["GET"])
def get_history():
    """Return all stored prediction records."""
    records = database.fetch_all_predictions()
    return jsonify(records), 200


# ──────────────────────────────────────────────────────────────────────────────
# API: DELETE /api/history
# ──────────────────────────────────────────────────────────────────────────────

@app.route("/api/history", methods=["DELETE"])
def clear_history():
    """Delete all prediction records from the database."""
    database.delete_all_predictions()
    return jsonify({"message": "All prediction history has been cleared."}), 200


# ──────────────────────────────────────────────────────────────────────────────
# API: GET /api/chart-data
# ──────────────────────────────────────────────────────────────────────────────

@app.route("/api/chart-data", methods=["GET"])
def chart_data():
    """
    Return data formatted for Chart.js visualisations:
      - labels    : timestamps
      - scores    : anomaly scores over time
      - statuses  : 'normal' | 'novel' per record
      - scatter   : [{x: temperature, y: pressure, status}]
    """
    records = database.get_predictions_for_chart()

    labels   = [r["timestamp"] for r in records]
    scores   = [r["score"]     for r in records]
    statuses = [r["prediction"] for r in records]
    scatter  = [
        {
            "x":      r["temperature"],
            "y":      r["pressure"],
            "status": "normal" if r["prediction"] == "Normal" else "novel"
        }
        for r in records
    ]

    return jsonify({
        "labels":   labels,
        "scores":   scores,
        "statuses": statuses,
        "scatter":  scatter
    }), 200


# ──────────────────────────────────────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 55)
    print("  Novelty Detection System -- Flask Server")
    print("=" * 55)
    app.run(debug=True, host="0.0.0.0", port=5000)

