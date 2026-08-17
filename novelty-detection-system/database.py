"""
database.py
-----------
Handles all SQLite database operations for the Novelty Detection System.
- Initialize the database
- Insert predictions
- Fetch all predictions
- Delete all predictions
- Get statistics
"""

import sqlite3
import os
from datetime import datetime

# Path to the SQLite database
DB_PATH = os.path.join(os.path.dirname(__file__), "database", "predictions.db")


def get_connection():
    """Create and return a new database connection."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Allows dict-like row access
    return conn


def init_db():
    """
    Initialize the database.
    Creates the 'predictions' table if it does not already exist.
    """
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS predictions (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp   TEXT NOT NULL,
            temperature REAL NOT NULL,
            pressure    REAL NOT NULL,
            vibration   REAL NOT NULL,
            speed       REAL NOT NULL,
            prediction  TEXT NOT NULL,
            score       REAL NOT NULL
        )
    """)
    conn.commit()
    conn.close()
    print("[DB] Database initialized successfully.")


def insert_prediction(temperature, pressure, vibration, speed, prediction, score):
    """
    Insert a new prediction record into the database.

    Args:
        temperature (float): Temperature input value
        pressure    (float): Pressure input value
        vibration   (float): Vibration input value
        speed       (float): Speed input value
        prediction  (str):   'Normal' or 'Novel/Unusual'
        score       (float): Anomaly score from Isolation Forest
    """
    conn = get_connection()
    cursor = conn.cursor()
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
        INSERT INTO predictions (timestamp, temperature, pressure, vibration, speed, prediction, score)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (timestamp, temperature, pressure, vibration, speed, prediction, score))
    conn.commit()
    conn.close()


def fetch_all_predictions():
    """
    Fetch all prediction records from the database.

    Returns:
        list[dict]: A list of prediction records as dictionaries.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM predictions ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def delete_all_predictions():
    """
    Delete all records from the predictions table.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM predictions")
    conn.commit()
    conn.close()


def get_statistics():
    """
    Return summary statistics from the predictions table.

    Returns:
        dict: {
            total_predictions (int),
            normal_count      (int),
            novel_count       (int),
            novelty_rate      (float) - percentage
        }
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM predictions")
    total = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM predictions WHERE prediction = 'Normal'")
    normal = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM predictions WHERE prediction = 'Novel/Unusual'")
    novel = cursor.fetchone()[0]

    conn.close()

    novelty_rate = round((novel / total * 100), 2) if total > 0 else 0.0

    return {
        "total_predictions": total,
        "normal_count": normal,
        "novel_count": novel,
        "novelty_rate": novelty_rate
    }


def get_predictions_for_chart():
    """
    Fetch recent predictions for time-series chart display.
    Returns last 50 predictions in ascending chronological order.

    Returns:
        list[dict]: Prediction records with timestamp, prediction, score.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT timestamp, prediction, score, temperature, pressure
        FROM (
            SELECT timestamp, prediction, score, temperature, pressure
            FROM predictions
            ORDER BY id DESC LIMIT 50
        )
        ORDER BY timestamp ASC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]
