import os
import json
import re
import random
import numpy as np
import joblib
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS

# Load .env from project root
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env'))


# ── Setup ─────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, 'model')

# ── Load model artifacts ──────────────────────────────────────────────
print("Loading model artifacts...")

model = joblib.load(os.path.join(MODEL_DIR, 'model.joblib'))
label_encoder = joblib.load(os.path.join(MODEL_DIR, 'label_encoder.joblib'))

with open(os.path.join(MODEL_DIR, 'symptom_columns.json'), 'r', encoding='utf-8') as f:
    symptom_list = json.load(f)

# Load severity weights
severity_weights = {}
severity_path = os.path.join(MODEL_DIR, 'severity_weights.json')
if os.path.exists(severity_path):
    with open(severity_path, 'r', encoding='utf-8') as f:
        severity_weights = json.load(f)
    print(f"  ✅ Severity weights loaded ({len(severity_weights)} entries)")

# Load disease info (descriptions, precautions, severity)
disease_info = {}
disease_info_path = os.path.join(MODEL_DIR, 'disease_info.json')
if os.path.exists(disease_info_path):
    with open(disease_info_path, 'r', encoding='utf-8') as f:
        disease_info = json.load(f)
    print(f"  ✅ Disease info loaded ({len(disease_info)} diseases)")

# Load synonym mapping
symptom_synonyms = {}
synonyms_path = os.path.join(MODEL_DIR, 'symptom_synonyms.json')
if os.path.exists(synonyms_path):
    with open(synonyms_path, 'r', encoding='utf-8') as f:
        symptom_synonyms = json.load(f)
    print(f"  ✅ Symptom synonyms loaded ({len(symptom_synonyms)} mappings)")

# Load medical FAQ
medical_faq = {}
faq_path = os.path.join(MODEL_DIR, 'medical_faq.json')
if os.path.exists(faq_path):
    with open(faq_path, 'r', encoding='utf-8') as f:
        medical_faq = json.load(f)
    print(f"  ✅ Medical FAQ loaded")

# Load follow-up questions
followup_data = {}
followup_path = os.path.join(MODEL_DIR, 'followup_questions.json')
if os.path.exists(followup_path):
    with open(followup_path, 'r', encoding='utf-8') as f:
        followup_data = json.load(f)
    print(f"  ✅ Follow-up questions loaded")

print(f"✅ Model loaded — {len(symptom_list)} symptoms, {len(label_encoder.classes_)} diseases")


# ── Negation detection ────────────────────────────────────────────────
NEGATION_PATTERNS = [
    r"(?:no|not|don'?t|doesn'?t|without|haven'?t|hasn'?t|never|ain'?t|can'?t)\s+(?:have\s+|having\s+|feel\s+|feeling\s+|got\s+|experience\s+|experiencing\s+|any\s+)?",
]

def detect_negated_terms(text):
    """Find terms that are negated in the text (e.g., 'no fever', 'don't have headache')."""
    negated = set()
    text_lower = text.lower()
    
    for pattern in NEGATION_PATTERNS:
        for match in re.finditer(pattern, text_lower):
            # Get the word(s) after the negation
            start = match.end()
            remaining = text_lower[start:start + 40]  # look ahead 40 chars
            # Extract the next meaningful word(s)
            words = remaining.split()
            if words:
                negated_phrase = words[0].strip('.,!?')
                negated.add(negated_phrase)
                # Also try two-word phrases
                if len(words) > 1:
                    negated.add(f"{words[0]} {words[1]}".strip('.,!?'))
    
    return negated


# ── NLP: Extract symptoms from natural text ───────────────────────────
def extract_symptoms_from_text(text):
    """
    Extract recognized symptoms from natural language text.
    Uses synonym mapping, partial matching, and negation detection.
    """
    text_lower = text.lower().strip()
    
    # Detect negated terms
    negated_terms = detect_negated_terms(text_lower)

    # Remove common filler words for cleaner matching
    fillers = [
        'i have', 'i am having', 'i\'m having', 'i feel', 'i\'m feeling',
        'feeling', 'having', 'suffering from', 'experiencing', 'got',
        'there is', 'there\'s', 'with', 'and', 'also', 'sometimes',
        'very', 'really', 'extremely', 'slightly', 'a bit', 'lot of',
        'lots of', 'too much', 'severe', 'mild', 'chronic', 'acute',
        'sudden', 'constant', 'frequent', 'occasional', 'persistent',
        'since', 'from', 'for', 'last', 'past', 'few days', 'few weeks',
        'please', 'help', 'what', 'could', 'can', 'should', 'doctor',
        'tell me', 'suggest', 'advise', 'medicine', 'treatment'
    ]

    cleaned = text_lower
    for filler in sorted(fillers, key=len, reverse=True):
        cleaned = cleaned.replace(filler, ' ')

    # Normalize extra spaces
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()

    matched_symptoms = set()
    matched_details = []

    # 1. Try synonym mapping (longest match first)
    for phrase, symptom_name in sorted(symptom_synonyms.items(), key=lambda x: len(x[0]), reverse=True):
        if phrase in text_lower:
            # Check if this phrase is negated
            is_negated = any(neg in phrase or phrase.startswith(neg) for neg in negated_terms)
            if is_negated:
                continue
                
            if symptom_name in symptom_list:
                if symptom_name not in matched_symptoms:
                    matched_symptoms.add(symptom_name)
                    matched_details.append({
                        'matched_phrase': phrase,
                        'symptom': symptom_name,
                        'method': 'synonym'
                    })

    # 2. Try direct symptom name match (with underscores replaced)
    for symptom in symptom_list:
        readable = symptom.replace('_', ' ')
        if readable in text_lower and symptom not in matched_symptoms:
            # Check negation
            is_negated = any(neg in readable or readable.startswith(neg) for neg in negated_terms)
            if is_negated:
                continue
            matched_symptoms.add(symptom)
            matched_details.append({
                'matched_phrase': readable,
                'symptom': symptom,
                'method': 'direct'
            })

    # 3. Try partial word matching for remaining
    words = cleaned.split()
    for word in words:
        if len(word) < 4:
            continue
        # Skip negated words
        if word in negated_terms:
            continue
        word_normalized = word.replace(' ', '_')
        for symptom in symptom_list:
            if symptom not in matched_symptoms:
                if word_normalized in symptom or symptom.startswith(word_normalized):
                    matched_symptoms.add(symptom)
                    matched_details.append({
                        'matched_phrase': word,
                        'symptom': symptom,
                        'method': 'partial'
                    })
                    break

    return list(matched_symptoms), matched_details


# ── Build feature vector ──────────────────────────────────────────────
def symptoms_to_vector(symptoms):
    """Convert a list of symptom names to a severity-weighted feature vector."""
    vector = np.zeros(len(symptom_list), dtype=float)
    matched = []
    unmatched = []

    for symptom in symptoms:
        normalized = symptom.strip().lower().replace(' ', '_')

        if normalized in symptom_list:
            idx = symptom_list.index(normalized)
            weight = severity_weights.get(normalized, 1)
            vector[idx] = weight
            matched.append(normalized)
        else:
            synonym_match = symptom_synonyms.get(symptom.strip().lower())
            if synonym_match and synonym_match in symptom_list:
                idx = symptom_list.index(synonym_match)
                weight = severity_weights.get(synonym_match, 1)
                vector[idx] = weight
                matched.append(synonym_match)
            else:
                found = False
                for s in symptom_list:
                    if normalized in s or s in normalized:
                        idx = symptom_list.index(s)
                        weight = severity_weights.get(s, 1)
                        vector[idx] = weight
                        matched.append(s)
                        found = True
                        break
                if not found:
                    unmatched.append(symptom)

    return vector, matched, unmatched


# ── FAQ Matching ──────────────────────────────────────────────────────
def match_faq(text):
    """Check if user's text matches a medical FAQ or platform guidance question."""
    text_lower = text.lower().strip()
    
    # Check medical knowledge FAQs
    if 'medical_knowledge' in medical_faq:
        for topic, data in medical_faq['medical_knowledge'].items():
            for pattern in data.get('question_patterns', []):
                if pattern in text_lower or text_lower in pattern:
                    return data['answer'], 'medical_knowledge'
    
    # Check platform guidance FAQs
    if 'platform_guidance' in medical_faq:
        for topic, data in medical_faq['platform_guidance'].items():
            for pattern in data.get('question_patterns', []):
                if pattern in text_lower or text_lower in pattern:
                    return data['answer'], 'platform_guidance'
    
    return None, None


# ── Follow-up question logic ─────────────────────────────────────────
def get_followup_questions(matched_symptoms, symptom_count):
    """Get relevant follow-up questions based on matched symptoms."""
    min_for_diagnosis = followup_data.get('min_symptoms_for_diagnosis', 3)
    
    if symptom_count >= min_for_diagnosis:
        return None  # Enough symptoms, proceed with diagnosis
    
    questions = []
    symptom_followups = followup_data.get('symptom_followups', {})
    
    # Get specific follow-ups for matched symptoms
    for symptom in matched_symptoms:
        if symptom in symptom_followups:
            qs = symptom_followups[symptom]
            questions.extend(qs[:2])  # Take top 2 per symptom
    
    # If no specific follow-ups found, use generic ones
    if not questions:
        questions = followup_data.get('generic_followups', [])[:3]
    
    # Limit and deduplicate
    seen = set()
    unique_questions = []
    for q in questions:
        if q not in seen:
            seen.add(q)
            unique_questions.append(q)
        if len(unique_questions) >= 3:
            break
    
    return unique_questions


# ── Routes ────────────────────────────────────────────────────────────

@app.route('/predict', methods=['POST'])
def predict():
    """Predict disease from symptoms with enriched response."""
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

    vector, matched, unmatched = symptoms_to_vector(symptoms)

    if sum(vector) == 0:
        return jsonify({
            'error': 'None of the provided symptoms were recognized',
            'unmatched_symptoms': unmatched,
            'available_symptoms': symptom_list[:20]
        }), 400

    vector_2d = vector.reshape(1, -1)
    prediction = model.predict(vector_2d)[0]
    probabilities = model.predict_proba(vector_2d)[0]

    top_3_indices = np.argsort(probabilities)[::-1][:3]
    top_3 = []
    for idx in top_3_indices:
        disease_name = label_encoder.classes_[idx]
        info = disease_info.get(disease_name, {})
        top_3.append({
            'disease': disease_name,
            'confidence': round(float(probabilities[idx]), 4),
            'severity': info.get('severity', 'unknown')
        })

    predicted_disease = label_encoder.classes_[prediction]
    confidence = round(float(probabilities[prediction]), 4)
    info = disease_info.get(predicted_disease, {})

    return jsonify({
        'disease': predicted_disease,
        'confidence': confidence,
        'description': info.get('description', ''),
        'precautions': info.get('precautions', []),
        'severity': info.get('severity', 'unknown'),
        'top_3': top_3,
        'matched_symptoms': matched,
        'unmatched_symptoms': unmatched
    })


@app.route('/nlp-extract', methods=['POST'])
def nlp_extract():
    """Extract recognized symptoms from natural language text."""
    data = request.get_json()

    if not data or 'text' not in data:
        return jsonify({'error': 'Missing "text" field'}), 400

    text = data['text']
    if not text or not text.strip():
        return jsonify({'error': 'Text cannot be empty'}), 400

    symptoms, details = extract_symptoms_from_text(text)

    return jsonify({
        'extracted_symptoms': symptoms,
        'match_details': details,
        'count': len(symptoms)
    })


@app.route('/analyze', methods=['POST'])
def analyze():
    """
    Full pipeline: extract symptoms → check if enough → predict or ask follow-ups.
    This is the primary endpoint the chatbot uses.
    """
    data = request.get_json()

    if not data or 'text' not in data:
        return jsonify({'error': 'Missing "text" field'}), 400

    text = data['text']
    if not text or not text.strip():
        return jsonify({'error': 'Text cannot be empty'}), 400

    # Check for accumulated symptoms from previous conversation turns
    accumulated = data.get('accumulated_symptoms', [])

    # Step 0: Check if this is a FAQ / platform question
    faq_answer, faq_type = match_faq(text)
    if faq_answer:
        return jsonify({
            'success': True,
            'type': 'faq',
            'faq_type': faq_type,
            'answer': faq_answer
        })

    # Step 1: Extract symptoms from natural language
    symptoms, match_details = extract_symptoms_from_text(text)

    # Merge with accumulated symptoms from conversation
    all_symptoms = list(set(symptoms + accumulated))

    if not all_symptoms:
        return jsonify({
            'success': False,
            'error': 'no_symptoms_found',
            'message': 'Could not identify any medical symptoms from your message.',
            'text': text
        })

    # Step 2: Check if we have enough symptoms for a confident diagnosis
    min_symptoms = followup_data.get('min_symptoms_for_diagnosis', 3)
    
    if len(all_symptoms) < min_symptoms:
        followups = get_followup_questions(all_symptoms, len(all_symptoms))
        return jsonify({
            'success': True,
            'type': 'followup',
            'message': f"I found {len(all_symptoms)} symptom(s) so far. Let me ask a few more questions for a better diagnosis.",
            'matched_symptoms': all_symptoms,
            'followup_questions': followups or [],
            'match_details': match_details
        })

    # Step 3: Enough symptoms — build feature vector and predict
    vector, matched, unmatched = symptoms_to_vector(all_symptoms)

    if sum(vector) == 0:
        return jsonify({
            'success': False,
            'error': 'no_valid_symptoms',
            'message': 'Symptoms were found but could not be processed.',
            'extracted_symptoms': all_symptoms
        })

    vector_2d = vector.reshape(1, -1)
    prediction = model.predict(vector_2d)[0]
    probabilities = model.predict_proba(vector_2d)[0]

    top_3_indices = np.argsort(probabilities)[::-1][:3]
    top_3 = []
    for idx in top_3_indices:
        disease_name = label_encoder.classes_[idx]
        info = disease_info.get(disease_name, {})
        top_3.append({
            'disease': disease_name,
            'confidence': round(float(probabilities[idx]), 4),
            'severity': info.get('severity', 'unknown'),
            'description': info.get('description', '')
        })

    predicted_disease = label_encoder.classes_[prediction]
    confidence = round(float(probabilities[prediction]), 4)
    info = disease_info.get(predicted_disease, {})

    return jsonify({
        'success': True,
        'type': 'diagnosis',
        'disease': predicted_disease,
        'confidence': confidence,
        'description': info.get('description', ''),
        'precautions': info.get('precautions', []),
        'severity': info.get('severity', 'unknown'),
        'medications': info.get('medications', []),
        'diets': info.get('diets', []),
        'workouts': info.get('workouts', []),
        'top_3': top_3,
        'matched_symptoms': matched,
        'match_details': match_details
    })


@app.route('/faq', methods=['POST'])
def faq():
    """Direct FAQ query endpoint."""
    data = request.get_json()
    if not data or 'text' not in data:
        return jsonify({'error': 'Missing "text" field'}), 400
    
    answer, faq_type = match_faq(data['text'])
    if answer:
        return jsonify({'success': True, 'answer': answer, 'type': faq_type})
    return jsonify({'success': False, 'message': 'No matching FAQ found'})


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
        'n_diseases': len(label_encoder.classes_),
        'n_synonyms': len(symptom_synonyms),
        'has_disease_info': len(disease_info) > 0,
        'has_severity_weights': len(severity_weights) > 0,
        'has_faq': len(medical_faq) > 0,
        'has_followups': len(followup_data) > 0
    })


# ── Main ──────────────────────────────────────────────────────────────
if __name__ == '__main__':
    print("\n🚀 Starting prediction server on http://localhost:5000")
    print("   POST /analyze     — Full NLP + prediction pipeline (chatbot)")
    print("   POST /predict     — Predict disease from symptom names")
    print("   POST /nlp-extract — Extract symptoms from text")
    print("   POST /faq         — Medical & platform FAQ")
    print("   GET  /symptoms    — List all symptoms")
    print("   GET  /health      — Health check\n")
    app.run(host='0.0.0.0', port=5000, debug=True)
