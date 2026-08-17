"""
test_app.py
-----------
Automated test suite to verify all Flask endpoints, ML prediction, and Database operations.
"""

import unittest
import json
from app import app
import database


class NoveltyDetectionTestCase(unittest.TestCase):

    def setUp(self):
        self.client = app.test_client()
        self.client.testing = True

    def test_pages(self):
        # 1. Home page
        res = self.client.get('/')
        self.assertEqual(res.status_code, 200)
        self.assertIn(b'Novelty Detection System', res.data)

        # 2. Dashboard page
        res = self.client.get('/dashboard')
        self.assertEqual(res.status_code, 200)
        self.assertIn(b'Enter Sensor Data', res.data)

        # 3. History page
        res = self.client.get('/history')
        self.assertEqual(res.status_code, 200)
        self.assertIn(b'Prediction Records', res.data)

    def test_predict_normal(self):
        payload = {
            "temperature": 25.0,
            "pressure": 100.0,
            "vibration": 3.0,
            "speed": 55.0
        }
        res = self.client.post('/api/predict', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data["prediction"], "Normal")
        self.assertEqual(data["status"], "normal")
        self.assertIn("score", data)

    def test_predict_unusual(self):
        payload = {
            "temperature": 95.0,
            "pressure": 190.0,
            "vibration": 25.0,
            "speed": 140.0
        }
        res = self.client.post('/api/predict', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data["prediction"], "Novel/Unusual")
        self.assertEqual(data["status"], "novel")
        self.assertIn("score", data)

    def test_predict_validation(self):
        # Missing fields
        res = self.client.post('/api/predict', data=json.dumps({"temperature": 25}), content_type='application/json')
        self.assertEqual(res.status_code, 400)

        # Non-numeric
        res = self.client.post('/api/predict', data=json.dumps({
            "temperature": "abc", "pressure": 100, "vibration": 3, "speed": 55
        }), content_type='application/json')
        self.assertEqual(res.status_code, 400)

    def test_stats_and_history(self):
        res = self.client.get('/api/statistics')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertIn("total_predictions", data)
        self.assertIn("normal_count", data)
        self.assertIn("novel_count", data)

        res_hist = self.client.get('/api/history')
        self.assertEqual(res_hist.status_code, 200)
        hist_data = json.loads(res_hist.data)
        self.assertIsInstance(hist_data, list)

        res_chart = self.client.get('/api/chart-data')
        self.assertEqual(res_chart.status_code, 200)
        chart_data = json.loads(res_chart.data)
        self.assertIn("labels", chart_data)
        self.assertIn("scores", chart_data)


if __name__ == '__main__':
    unittest.main()
