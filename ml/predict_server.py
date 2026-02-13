import os
import json
import numpy as np
import joblib
from flask import Flask, request, jsonify
from flask_cors import CORS


# ── Setup ─────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, 'model')

# Load model artifacts on startup
print("Loading model artifacts...")
model = joblib.load(os.path.join(MODEL_DIR, 'model.joblib'))
label_encoder = joblib.load(os.path.join(MODEL_DIR, 'label_encoder.joblib'))

with open(os.path.join(MODEL_DIR, 'symptom_columns.json'), 'r') as f:
    symptom_list = json.load(f)

print(f"✅ Model loaded — {len(symptom_list)} symptoms, {len(label_encoder.classes_)} diseases")


# ── Helper ────────────────────────────────────────────────────────────
def symptoms_to_vector(symptoms):
    """Convert a list of symptom names to a binary feature vector."""
    vector = np.zeros(len(symptom_list), dtype=int)
    matched = []
    unmatched = []

    for symptom in symptoms:
        # Normalize: lowercase + replace spaces with underscores
        normalized = symptom.strip().lower().replace(' ', '_')

        # Try direct match
        if normalized in symptom_list:
            idx = symptom_list.index(normalized)
            vector[idx] = 1
            matched.append(normalized)
        else:
            # Try partial match — find symptoms containing this word
            found = False
            for s in symptom_list:
                if normalized in s or s in normalized:
                    idx = symptom_list.index(s)
                    vector[idx] = 1
                    matched.append(s)
                    found = True
                    break
            if not found:
                unmatched.append(symptom)

    return vector, matched, unmatched


# ── Routes ────────────────────────────────────────────────────────────
@app.route('/predict', methods=['POST'])
def predict():
 
    data = request.get_json()

    if not data or 'symptoms' not in data:
        return jsonify({
            'error': 'Missing "symptoms" field in request body'
        }), 400

    symptoms = data['symptoms']
    if not symptoms or len(symptoms) == 0:
        return jsonify({
            'error': 'At least one symptom is required'
        }), 400

    # Build feature vector
    vector, matched, unmatched = symptoms_to_vector(symptoms)

    if sum(vector) == 0:
        return jsonify({
            'error': 'None of the provided symptoms were recognized',
            'unmatched_symptoms': unmatched,
            'available_symptoms': symptom_list[:20]  # Show some examples
        }), 400

    # Predict
    vector_2d = vector.reshape(1, -1)
    prediction = model.predict(vector_2d)[0]
    probabilities = model.predict_proba(vector_2d)[0]

    # Get top 3 predictions
    top_3_indices = np.argsort(probabilities)[::-1][:3]
    top_3 = []
    for idx in top_3_indices:
        top_3.append({
            'disease': label_encoder.classes_[idx],
            'confidence': round(float(probabilities[idx]), 4)
        })

    predicted_disease = label_encoder.classes_[prediction]
    confidence = round(float(probabilities[prediction]), 4)

    return jsonify({
        'disease': predicted_disease,
        'confidence': confidence,
        'top_3': top_3,
        'matched_symptoms': matched,
        'unmatched_symptoms': unmatched
    })


@app.route('/symptoms', methods=['GET'])
def get_symptoms():
    """Return the full list of recognized symptoms."""
    return jsonify({
        'symptoms': symptom_list,
        'count': len(symptom_list)
    })


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({
        'status': 'ok',
        'model_loaded': model is not None,
        'n_symptoms': len(symptom_list),
        'n_diseases': len(label_encoder.classes_)
    })


# ── Main ──────────────────────────────────────────────────────────────
if __name__ == '__main__':
    print("\n🚀 Starting prediction server on http://localhost:5000")
    print("   POST /predict   — Predict disease from symptoms")
    print("   GET  /symptoms  — List all symptoms")
    print("   GET  /health    — Health check\n")
    app.run(host='0.0.0.0', port=5000, debug=True)
