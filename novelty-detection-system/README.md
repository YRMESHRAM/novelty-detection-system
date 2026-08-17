# 🔬 Novelty Detection System

### AI-Based Detection of Unusual and Previously Unseen Patterns

---

## 📌 Project Overview

The **Novelty Detection System** is a full-stack Machine Learning web application that learns what "normal" sensor data looks like and flags any data point that deviates significantly from the learned pattern. It is built using **Python (Flask)** on the backend, **Scikit-learn's Isolation Forest** for ML, **SQLite** for storage, and a clean, responsive **HTML/CSS/Vanilla JS** frontend.

---

## 🎯 Problem Statement

In industrial and IoT environments, detecting anomalous readings early — before they cause failures — is critical. Traditional rule-based threshold systems require manual tuning. Machine Learning can automatically learn what "normal" looks like and raise alerts when the data deviates, without prior knowledge of what the anomaly looks like.

---

## 🏆 Objectives

1. Build a functional novelty/anomaly detection system using unsupervised ML.
2. Provide a clean, interactive web interface for entering sensor data and viewing results.
3. Store all predictions in a persistent database for audit/review.
4. Visualise results using charts to aid interpretation.
5. Demonstrate the Isolation Forest algorithm in a practical, explainable context.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 AI Detection | Isolation Forest classifies inputs as Normal or Novel/Unusual |
| ⚡ Real-Time Analysis | Sub-second predictions via REST API |
| 📊 Visual Dashboard | Doughnut, line, and scatter charts via Chart.js |
| 📋 Prediction History | All results stored in SQLite and viewable in a filterable table |
| 🔍 Filter & Search | Filter by Normal/Novel and search across all columns |
| 📱 Responsive Design | Works on desktop, tablet, and mobile |
| 🛡️ Validated Inputs | Both client-side (JS) and server-side (Flask) validation |
| 🗑️ Clear History | Delete all records with a safety confirmation dialog |

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript, Chart.js |
| Backend | Python 3.10+, Flask, Flask-CORS |
| Machine Learning | Scikit-learn (Isolation Forest), NumPy, Pandas |
| Database | SQLite (via Python's built-in `sqlite3`) |
| Model Persistence | Joblib |

---

## 🧠 Machine Learning Algorithm

### Isolation Forest

**Isolation Forest** is an unsupervised anomaly detection algorithm that works by isolating observations using random decision trees.

**Key concepts:**
- It builds many random binary trees over the dataset.
- **Normal points** are harder to isolate — they require many splits (deep in the tree).
- **Anomalous points** are easier to isolate — they require fewer splits (shallow in the tree).
- The anomaly score is based on the average path length across all trees.

**Configuration used:**
```python
IsolationForest(
    n_estimators  = 100,   # Number of trees
    contamination = 0.05,  # Expected fraction of anomalies
    random_state  = 42
)
```

**Training data:**
- 950 normal samples: Temperature 20–30°C, Pressure 90–110 hPa, Vibration 1–5 mm/s, Speed 40–70 RPM
- 50 anomalous samples: Temperature 70–100°C, Pressure 150–200 hPa, Vibration 15–30 mm/s, Speed 100–150 RPM
- Model is trained **only** on normal samples (true novelty detection).

---

## 🏗️ System Architecture

```
Browser (HTML/CSS/JS)
        │
        │  HTTP POST /api/predict
        │  HTTP GET  /api/statistics
        │  HTTP GET  /api/history
        │  HTTP GET  /api/chart-data
        ▼
Flask Application (app.py)
        │
   ┌────┴─────────────────┐
   │                      │
model.py              database.py
(Isolation Forest)    (SQLite CRUD)
        │                  │
novelty_model.pkl    predictions.db
```

---

## 📁 Project Structure

```
novelty-detection-system/
│
├── app.py              ← Flask server & API endpoints
├── model.py            ← Model loading & prediction interface
├── train_model.py      ← Dataset generation & model training
├── database.py         ← SQLite database operations
├── requirements.txt    ← Python dependencies
├── README.md           ← This file
│
├── model/
│   └── novelty_model.pkl   ← Trained Isolation Forest model
│
├── data/
│   └── dataset.csv         ← Synthetic training dataset
│
├── database/
│   └── predictions.db      ← SQLite predictions database
│
├── templates/
│   ├── index.html          ← Home / Landing page
│   ├── dashboard.html      ← ML Prediction Dashboard
│   └── history.html        ← Prediction History page
│
└── static/
    ├── css/
    │   └── style.css       ← Complete design system
    └── js/
        ├── main.js         ← Shared: navbar, toast, canvas animation
        ├── dashboard.js    ← Dashboard: predict, charts, stats
        └── history.js      ← History: load, filter, search, clear
```

---

## ⚙️ Installation & Setup

### Prerequisites
- Python 3.10 or higher
- pip

### Step 1: Navigate to project directory
```bash
cd novelty-detection-system
```

### Step 2: (Optional) Create a virtual environment
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

### Step 3: Install dependencies
```bash
pip install -r requirements.txt
```

### Step 4: Train the ML model
```bash
python train_model.py
```
This will:
- Generate `data/dataset.csv` (1000 samples)
- Train the Isolation Forest model
- Save it to `model/novelty_model.pkl`

---

## 🚀 Running the Application

### Step 5: Start the Flask server
```bash
python app.py
```

You should see:
```
 * Running on http://0.0.0.0:5000
```

### Step 6: Open in browser
```
http://localhost:5000
```

---

## 📡 API Documentation

### `POST /api/predict`
Run novelty detection on input sensor data.

**Request:**
```json
{
  "temperature": 25,
  "pressure": 100,
  "vibration": 3,
  "speed": 55
}
```

**Response (Normal):**
```json
{
  "prediction": "Normal",
  "status": "normal",
  "score": -0.12,
  "message": "The input data follows the learned normal pattern.",
  "inputs": { "temperature": 25, "pressure": 100, "vibration": 3, "speed": 55 }
}
```

**Response (Novel):**
```json
{
  "prediction": "Novel/Unusual",
  "status": "novel",
  "score": -0.65,
  "message": "A previously unseen or unusual pattern has been detected.",
  "inputs": { "temperature": 90, "pressure": 175, "vibration": 22, "speed": 130 }
}
```

---

### `GET /api/statistics`
Returns summary counts.

**Response:**
```json
{
  "total_predictions": 125,
  "normal_count": 108,
  "novel_count": 17,
  "novelty_rate": 13.6
}
```

---

### `GET /api/history`
Returns all prediction records (newest first).

### `GET /api/chart-data`
Returns data formatted for Chart.js (last 50 records).

### `DELETE /api/history`
Deletes all prediction records from the database.

---

## 🗄️ Database Information

**Engine:** SQLite (file-based, no setup required)  
**Location:** `database/predictions.db`

**Table: `predictions`**

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment ID |
| timestamp | TEXT | Date and time of prediction |
| temperature | REAL | Temperature input |
| pressure | REAL | Pressure input |
| vibration | REAL | Vibration input |
| speed | REAL | Speed input |
| prediction | TEXT | 'Normal' or 'Novel/Unusual' |
| score | REAL | Isolation Forest anomaly score |

---

## 📸 Screenshots

> *(Add screenshots of the Home, Dashboard, and History pages here)*
>
> - Home page with hero animation
> - Dashboard with result card (Normal)
> - Dashboard with result card (Novel)
> - Dashboard charts
> - History page with table

---

## 🔮 Future Scope

1. **User Authentication** — Login system to separate users' histories.
2. **Real Sensor Integration** — Connect to MQTT/HTTP streams from real IoT devices.
3. **Multiple Models** — Allow switching between Isolation Forest, One-Class SVM, and LOF.
4. **Email Alerts** — Send email notifications when a novel pattern is detected.
5. **Export** — Export prediction history as CSV or PDF report.
6. **Model Retraining** — Allow users to upload new normal data and retrain the model via the UI.
7. **Batch Prediction** — Upload a CSV file to run predictions on multiple rows at once.
8. **Deployment** — Docker containerization and deployment to AWS/Azure/GCP.

---

## 📚 References

- Scikit-learn Isolation Forest: https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.IsolationForest.html
- Original Paper: Liu, F. T., Ting, K. M., & Zhou, Z. H. (2008). Isolation Forest.
- Flask Documentation: https://flask.palletsprojects.com/
- Chart.js Documentation: https://www.chartjs.org/

---

*B.Tech CSE/AIML Academic Project — Pattern Recognition*
