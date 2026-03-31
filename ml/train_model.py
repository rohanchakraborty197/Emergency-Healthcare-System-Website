import os
import json
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report
import joblib
from dotenv import load_dotenv

# Load .env from project root
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env'))


# ── Paths ──────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, 'dataset')
MODEL_DIR = os.path.join(BASE_DIR, 'model')
os.makedirs(MODEL_DIR, exist_ok=True)

# STEP 1: Load all datasets

print("=" * 60)
print("STEP 1: Loading datasets...")
print("=" * 60)

df = pd.read_csv(os.path.join(DATASET_DIR, 'dataset.csv'))
# Strip whitespace from all string values (columns and cells)
for col in df.columns:
    if df[col].dtype == 'object':
        df[col] = df[col].str.strip()
df.columns = [c.strip() for c in df.columns]
print(f"  Main dataset: {len(df)} rows, {df['Disease'].nunique()} diseases")

# Load symptom severity weights
severity_df = pd.read_csv(os.path.join(DATASET_DIR, 'Symptom-severity.csv'))
severity_df.columns = severity_df.columns.str.strip()
severity_df['Symptom'] = severity_df['Symptom'].str.strip()
severity_map = dict(zip(severity_df['Symptom'], severity_df['weight']))
print(f"  Severity weights: {len(severity_map)} symptoms")

# Load disease descriptions
desc_df = pd.read_csv(os.path.join(DATASET_DIR, 'symptom_Description.csv'))
desc_df.columns = desc_df.columns.str.strip()
desc_df = desc_df.apply(lambda col: col.str.strip() if col.dtype == 'object' else col)
description_map = dict(zip(desc_df['Disease'], desc_df['Description']))
print(f"  Disease descriptions: {len(description_map)} diseases")

# Load precautions
prec_df = pd.read_csv(os.path.join(DATASET_DIR, 'symptom_precaution.csv'))
prec_df.columns = prec_df.columns.str.strip()
prec_df = prec_df.apply(lambda col: col.str.strip() if col.dtype == 'object' else col)
precaution_map = {}
for _, row in prec_df.iterrows():
    disease = row['Disease'].strip()
    precautions = []
    for i in range(1, 5):
        col = f'Precaution_{i}'
        if col in row and pd.notna(row[col]) and str(row[col]).strip():
            precautions.append(str(row[col]).strip())
    precaution_map[disease] = precautions
print(f"  Precautions: {len(precaution_map)} diseases")

# Get symptom columns
symptom_cols = [col for col in df.columns if col.startswith('Symptom')]
print(f"  Symptom columns: {len(symptom_cols)}")


# STEP 2: Extract unique symptoms

print("\n" + "=" * 60)
print("STEP 2: Extracting unique symptoms...")
print("=" * 60)

all_symptoms = set()
for col in symptom_cols:
    symptoms_in_col = df[col].dropna().unique()
    for s in symptoms_in_col:
        cleaned = str(s).strip()
        if cleaned:
            all_symptoms.add(cleaned)

all_symptoms = sorted(list(all_symptoms))
print(f"  Found {len(all_symptoms)} unique symptoms")
print(f"  Examples: {all_symptoms[:5]}")


# STEP 3: Build SEVERITY-WEIGHTED feature vectors

print("\n" + "=" * 60)
print("STEP 3: Building severity-weighted feature vectors...")
print("=" * 60)

def build_feature_vector(row, use_weights=True):
    """Convert a row of symptom names into a weighted feature vector."""
    vector = np.zeros(len(all_symptoms), dtype=float)
    for col in symptom_cols:
        symptom = row[col]
        if pd.notna(symptom):
            symptom_clean = str(symptom).strip()
            if symptom_clean in all_symptoms:
                idx = all_symptoms.index(symptom_clean)
                if use_weights:
                    # Use severity weight (default to 1 if not found)
                    vector[idx] = severity_map.get(symptom_clean, 1)
                else:
                    vector[idx] = 1
    return vector

# Build feature matrix with severity weights
X = np.array([build_feature_vector(row, use_weights=True) for _, row in df.iterrows()])
print(f"  Feature matrix shape: {X.shape}  (samples × symptoms)")
print(f"  Using severity weights (range: {X[X > 0].min():.0f} - {X[X > 0].max():.0f})")

# Encode disease labels
label_encoder = LabelEncoder()
y = label_encoder.fit_transform(df['Disease'])
print(f"  Classes: {len(label_encoder.classes_)}")



# STEP 4: Train-Test Split

print("\n" + "=" * 60)
print("STEP 4: Splitting data (80% train / 20% test)...")
print("=" * 60)

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
print(f"  Training samples: {len(X_train)}")
print(f"  Testing samples:  {len(X_test)}")


# STEP 5: Train BOTH RandomForest & GradientBoosting, pick best

print("\n" + "=" * 60)
print("STEP 5: Training classifiers...")
print("=" * 60)

# RandomForest
print("\n  📦 Training Random Forest...")
rf_model = RandomForestClassifier(
    n_estimators=200,
    max_depth=None,
    min_samples_split=2,
    min_samples_leaf=1,
    random_state=42,
    n_jobs=-1
)
rf_model.fit(X_train, y_train)
rf_pred = rf_model.predict(X_test)
rf_accuracy = accuracy_score(y_test, rf_pred)
print(f"  ✅ Random Forest Accuracy: {rf_accuracy * 100:.2f}%")

# GradientBoosting
print("\n  📦 Training Gradient Boosting...")
gb_model = GradientBoostingClassifier(
    n_estimators=200,
    max_depth=5,
    learning_rate=0.1,
    min_samples_split=3,
    min_samples_leaf=2,
    random_state=42
)
gb_model.fit(X_train, y_train)
gb_pred = gb_model.predict(X_test)
gb_accuracy = accuracy_score(y_test, gb_pred)
print(f"  ✅ Gradient Boosting Accuracy: {gb_accuracy * 100:.2f}%")

# Pick the best model
if gb_accuracy >= rf_accuracy:
    best_model = gb_model
    best_name = "GradientBoosting"
    best_accuracy = gb_accuracy
    best_pred = gb_pred
else:
    best_model = rf_model
    best_name = "RandomForest"
    best_accuracy = rf_accuracy
    best_pred = rf_pred

print(f"\n  🏆 Best Model: {best_name} ({best_accuracy * 100:.2f}%)")



# STEP 6: Evaluate

print("\n" + "=" * 60)
print("STEP 6: Evaluating model performance...")
print("=" * 60)

# Cross-validation on best model
cv_scores = cross_val_score(best_model, X, y, cv=5, scoring='accuracy')
print(f"\n  📊 Test Accuracy: {best_accuracy * 100:.2f}%")
print(f"  📊 Cross-Validation: {cv_scores.mean() * 100:.2f}% (±{cv_scores.std() * 100:.2f}%)")

print("\n  📋 Classification Report:")
report = classification_report(
    y_test, best_pred,
    target_names=label_encoder.classes_,
    zero_division=0
)
print(report)



# STEP 7: Build NLP synonym mapping

print("=" * 60)
print("STEP 7: Building NLP synonym mapping...")
print("=" * 60)

# Map common natural language terms to dataset symptom names
symptom_synonyms = {
    # General terms
    "headache": "headache",
    "head pain": "headache",
    "head ache": "headache",
    "head hurts": "headache",
    "migraine": "headache",

    # Fever terms
    "fever": "high_fever",
    "temperature": "high_fever",
    "hot": "high_fever",
    "burning up": "high_fever",
    "mild fever": "mild_fever",
    "slight fever": "mild_fever",
    "low grade fever": "mild_fever",

    # Cough/Cold
    "cough": "cough",
    "coughing": "cough",
    "cold": "continuous_sneezing",
    "sneezing": "continuous_sneezing",
    "runny nose": "runny_nose",
    "nose running": "runny_nose",
    "stuffy nose": "congestion",
    "blocked nose": "congestion",
    "nasal congestion": "congestion",
    "sore throat": "throat_irritation",
    "throat pain": "throat_irritation",
    "throat irritation": "throat_irritation",

    # Stomach/GI
    "stomach pain": "stomach_pain",
    "stomach ache": "stomach_pain",
    "tummy ache": "stomach_pain",
    "belly pain": "belly_pain",
    "abdominal pain": "abdominal_pain",
    "nausea": "nausea",
    "nauseous": "nausea",
    "feeling sick": "nausea",
    "vomiting": "vomiting",
    "throwing up": "vomiting",
    "puking": "vomiting",
    "diarrhea": "diarrhoea",
    "diarrhoea": "diarrhoea",
    "loose motion": "diarrhoea",
    "loose stool": "diarrhoea",
    "constipation": "constipation",
    "constipated": "constipation",
    "indigestion": "indigestion",
    "bloating": "indigestion",
    "acidity": "acidity",
    "acid reflux": "acidity",
    "heartburn": "acidity",
    "gas": "passage_of_gases",
    "flatulence": "passage_of_gases",

    # Skin
    "itching": "itching",
    "itchy": "itching",
    "itch": "itching",
    "rash": "skin_rash",
    "skin rash": "skin_rash",
    "red spots": "red_spots_over_body",
    "spots on body": "red_spots_over_body",
    "pimples": "pus_filled_pimples",
    "acne": "pus_filled_pimples",
    "blackheads": "blackheads",
    "skin peeling": "skin_peeling",
    "blister": "blister",
    "blisters": "blister",

    # Pain
    "joint pain": "joint_pain",
    "joints hurt": "joint_pain",
    "knee pain": "knee_pain",
    "back pain": "back_pain",
    "backache": "back_pain",
    "neck pain": "neck_pain",
    "chest pain": "chest_pain",
    "muscle pain": "muscle_pain",
    "body pain": "muscle_pain",

    # Fatigue/Weakness
    "fatigue": "fatigue",
    "tired": "fatigue",
    "tiredness": "fatigue",
    "exhausted": "fatigue",
    "weakness": "muscle_weakness",
    "weak": "muscle_weakness",
    "lethargy": "lethargy",
    "lethargic": "lethargy",
    "no energy": "lethargy",

    # Eyes
    "yellowish skin": "yellowish_skin",
    "yellow skin": "yellowish_skin",
    "yellow eyes": "yellowing_of_eyes",
    "blurred vision": "blurred_and_distorted_vision",
    "blurry vision": "blurred_and_distorted_vision",
    "vision problems": "blurred_and_distorted_vision",
    "red eyes": "redness_of_eyes",
    "watery eyes": "watering_from_eyes",

    # Breathing
    "breathlessness": "breathlessness",
    "shortness of breath": "breathlessness",
    "breathing difficulty": "breathlessness",
    "can't breathe": "breathlessness",
    "difficulty breathing": "breathlessness",
    "wheezing": "breathlessness",

    # Weight
    "weight loss": "weight_loss",
    "losing weight": "weight_loss",
    "weight gain": "weight_gain",
    "gaining weight": "weight_gain",

    # Mental/Mood
    "anxiety": "anxiety",
    "anxious": "anxiety",
    "nervous": "anxiety",
    "depression": "depression",
    "depressed": "depression",
    "sad": "depression",
    "mood swings": "mood_swings",
    "irritable": "irritability",
    "irritability": "irritability",
    "restless": "restlessness",
    "restlessness": "restlessness",

    # Urinary
    "burning urination": "burning_micturition",
    "painful urination": "burning_micturition",
    "burning pee": "burning_micturition",
    "frequent urination": "continuous_feel_of_urine",
    "dark urine": "dark_urine",
    "yellow urine": "yellow_urine",
    "smelly urine": "foul_smell_ofurine",

    # Other common
    "sweating": "sweating",
    "excessive sweating": "sweating",
    "chills": "chills",
    "shivering": "shivering",
    "dizziness": "dizziness",
    "dizzy": "dizziness",
    "vertigo": "spinning_movements",
    "spinning": "spinning_movements",
    "loss of appetite": "loss_of_appetite",
    "no appetite": "loss_of_appetite",
    "not hungry": "loss_of_appetite",
    "excessive hunger": "excessive_hunger",
    "always hungry": "excessive_hunger",
    "dehydration": "dehydration",
    "dehydrated": "dehydration",
    "swollen legs": "swollen_legs",
    "swelling": "swelling_joints",
    "swollen joints": "swelling_joints",
    "stiff neck": "stiff_neck",
    "stiffness": "movement_stiffness",
    "cramps": "cramps",
    "fast heartbeat": "fast_heart_rate",
    "rapid heartbeat": "fast_heart_rate",
    "palpitations": "palpitations",
    "heart pounding": "palpitations",
    "high blood sugar": "irregular_sugar_level",
    "blood sugar": "irregular_sugar_level",
    "obesity": "obesity",
    "overweight": "obesity",
    "bruising": "bruising",
    "bruises": "bruising",
    "bleeding": "stomach_bleeding",
    "blood in stool": "bloody_stool",
    "bloody stool": "bloody_stool",
    "loss of smell": "loss_of_smell",
    "can't smell": "loss_of_smell",
    "loss of balance": "loss_of_balance",
    "unsteady": "unsteadiness",
    "slurred speech": "slurred_speech",
    "speech problems": "slurred_speech",
    "swollen lymph nodes": "swelled_lymph_nodes",
    "enlarged thyroid": "enlarged_thyroid",
    "puffy face": "puffy_face_and_eyes",
    "brittle nails": "brittle_nails",
    "phlegm": "phlegm",
    "mucus": "mucoid_sputum",
    "sinus pressure": "sinus_pressure",
    "sinus": "sinus_pressure",
    "sunken eyes": "sunken_eyes",
}

print(f"  Built {len(symptom_synonyms)} synonym mappings")


# STEP 8: Build disease info bundle

print("\n" + "=" * 60)
print("STEP 8: Building disease info bundle...")
print("=" * 60)

# Classify disease severity
high_severity = [
    'AIDS', 'Heart attack', 'Paralysis (brain hemorrhage)',
    'Tuberculosis', 'Hepatitis B', 'Hepatitis C', 'Hepatitis D',
    'Hepatitis E', 'Dengue', 'Malaria', 'Typhoid', 'Pneumonia'
]

medium_severity = [
    'Diabetes ', 'Hypertension ', 'Jaundice', 'Bronchial Asthma',
    'Chronic cholestasis', 'Alcoholic hepatitis', 'Hyperthyroidism',
    'Hypothyroidism'
]

disease_info = {}
for disease in label_encoder.classes_:
    # Determine severity
    if disease in high_severity or disease.strip() in high_severity:
        severity = "high"
    elif disease in medium_severity or disease.strip() in medium_severity:
        severity = "medium"
    else:
        severity = "low"

    # Get description (try exact and stripped match)
    desc = description_map.get(disease, '')
    if not desc:
        desc = description_map.get(disease.strip(), '')
    # Try case-insensitive match
    if not desc:
        for k, v in description_map.items():
            if k.lower().strip() == disease.lower().strip():
                desc = v
                break

    # Get precautions (try exact and stripped match)
    prec = precaution_map.get(disease, [])
    if not prec:
        prec = precaution_map.get(disease.strip(), [])
    if not prec:
        for k, v in precaution_map.items():
            if k.lower().strip() == disease.lower().strip():
                prec = v
                break

    disease_info[disease] = {
        "description": desc,
        "precautions": prec,
        "severity": severity
    }

diseases_with_desc = sum(1 for d in disease_info.values() if d['description'])
diseases_with_prec = sum(1 for d in disease_info.values() if d['precautions'])
print(f"  Diseases with descriptions: {diseases_with_desc}/{len(disease_info)}")
print(f"  Diseases with precautions: {diseases_with_prec}/{len(disease_info)}")
print(f"  Severity breakdown: High={sum(1 for d in disease_info.values() if d['severity']=='high')}, "
      f"Medium={sum(1 for d in disease_info.values() if d['severity']=='medium')}, "
      f"Low={sum(1 for d in disease_info.values() if d['severity']=='low')}")

# STEP 9: Save all model artifacts

print("\n" + "=" * 60)
print("STEP 9: Saving model artifacts...")
print("=" * 60)

# Clean old model files first
for old_file in os.listdir(MODEL_DIR):
    old_path = os.path.join(MODEL_DIR, old_file)
    if os.path.isfile(old_path):
        try:
            os.remove(old_path)
        except Exception:
            pass

# Save the best model
model_path = os.path.join(MODEL_DIR, 'model.joblib')
joblib.dump(best_model, model_path)
print(f"  ✅ Model saved:           {model_path} ({best_name})")

# Save label encoder
encoder_path = os.path.join(MODEL_DIR, 'label_encoder.joblib')
joblib.dump(label_encoder, encoder_path)
print(f"  ✅ Label encoder saved:   {encoder_path}")

# Save symptom list
symptoms_path = os.path.join(MODEL_DIR, 'symptom_columns.json')
with open(symptoms_path, 'w') as f:
    json.dump(all_symptoms, f, indent=2)
print(f"  ✅ Symptom list saved:    {symptoms_path}")

# Save severity weights map
severity_path = os.path.join(MODEL_DIR, 'severity_weights.json')
with open(severity_path, 'w') as f:
    json.dump(severity_map, f, indent=2)
print(f"  ✅ Severity weights saved:{severity_path}")

# Save disease info (descriptions, precautions, severity)
disease_info_path = os.path.join(MODEL_DIR, 'disease_info.json')
with open(disease_info_path, 'w') as f:
    json.dump(disease_info, f, indent=2)
print(f"  ✅ Disease info saved:    {disease_info_path}")

# Save synonym mapping
synonyms_path = os.path.join(MODEL_DIR, 'symptom_synonyms.json')
with open(synonyms_path, 'w') as f:
    json.dump(symptom_synonyms, f, indent=2)
print(f"  ✅ Synonym mapping saved: {synonyms_path}")

# Save training metrics
metrics = {
    'best_model': best_name,
    'test_accuracy': float(best_accuracy),
    'rf_accuracy': float(rf_accuracy),
    'gb_accuracy': float(gb_accuracy),
    'cv_accuracy_mean': float(cv_scores.mean()),
    'cv_accuracy_std': float(cv_scores.std()),
    'n_samples': int(len(df)),
    'n_symptoms': int(len(all_symptoms)),
    'n_diseases': int(len(label_encoder.classes_)),
    'n_synonyms': int(len(symptom_synonyms)),
    'feature_type': 'severity_weighted',
    'diseases': list(label_encoder.classes_)
}
metrics_path = os.path.join(MODEL_DIR, 'metrics.json')
with open(metrics_path, 'w') as f:
    json.dump(metrics, f, indent=2)
print(f"  ✅ Metrics saved:         {metrics_path}")

print("\n" + "=" * 60)
print(f"🎉 TRAINING COMPLETE!")
print(f"   Best Model:  {best_name}")
print(f"   Accuracy:    {best_accuracy * 100:.2f}%")
print(f"   CV Accuracy: {cv_scores.mean() * 100:.2f}% (±{cv_scores.std() * 100:.2f}%)")
print(f"   Features:    Severity-weighted ({len(all_symptoms)} symptoms)")
print(f"   Diseases:    {len(label_encoder.classes_)}")
print(f"   Synonyms:    {len(symptom_synonyms)} NLP mappings")
print(f"   Saved to:    {MODEL_DIR}")
print("=" * 60)
