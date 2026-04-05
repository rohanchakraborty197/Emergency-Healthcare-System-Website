import os
import json
import ast
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

# ══════════════════════════════════════════════════════════════════════
# STEP 1: Load ALL datasets
# ══════════════════════════════════════════════════════════════════════

print("=" * 60)
print("STEP 1: Loading datasets...")
print("=" * 60)

# ── Dataset 1: Original (Disease, Symptom_1 ... Symptom_17) ──
df1 = pd.read_csv(os.path.join(DATASET_DIR, 'dataset.csv'))
for col in df1.columns:
    if df1[col].dtype == 'object':
        df1[col] = df1[col].str.strip()
df1.columns = [c.strip() for c in df1.columns]
print(f"  Dataset 1 (dataset.csv): {len(df1)} rows, {df1['Disease'].nunique()} diseases")

# ── Dataset 2 & 3: Training.csv & Testing.csv (binary columns) ──
binary_dfs = []
for file_name in ['Training.csv', 'Testing.csv']:
    path = os.path.join(DATASET_DIR, file_name)
    if os.path.exists(path):
        binary_df = pd.read_csv(path)
        binary_df.columns = [c.strip() for c in binary_df.columns]
        # Fix trailing comma issues in Kaggle CSVs causing 'Unnamed' columns
        prognosis_col = [c for c in binary_df.columns if 'prognosis' in c.lower()][0]
        symptom_cols_bin = [c for c in binary_df.columns if c != prognosis_col and 'unnamed' not in c.lower()]
        
        rows = []
        for _, row in binary_df.iterrows():
            disease = row[prognosis_col].strip() if isinstance(row[prognosis_col], str) else str(row[prognosis_col])
            active = [col for col in symptom_cols_bin if row[col] == 1]
            padded = active[:17] + [np.nan] * max(0, 17 - len(active))
            rows.append([disease] + padded)
            
        cols = ['Disease'] + [f'Symptom_{i+1}' for i in range(17)]
        converted = pd.DataFrame(rows, columns=cols)
        binary_dfs.append(converted)
        print(f"  {file_name} converted: {len(converted)} rows")

# ── Merge datasets ──
all_dataframes = [df1] + binary_dfs
if len(all_dataframes) > 1:
    df_merged = pd.concat(all_dataframes, ignore_index=True)
    
    # Normalize disease names 
    name_map = {}
    for d1 in df1['Disease'].unique():
        for d2 in df_merged['Disease'].unique():
            if d1.lower().strip() == d2.lower().strip() and d1 != d2:
                name_map[d2] = d1
                
    if name_map:
        df_merged['Disease'] = df_merged['Disease'].replace(name_map)
        print(f"  Normalized {len(name_map)} disease name mismatches")
        
    df = df_merged
    print(f"  ✅ Merged: {len(df)} total rows, {df['Disease'].nunique()} diseases")
else:
    df = df1
    print(f"  Using single dataset: {len(df)} rows")

# ── Load symptom severity weights ──
severity_df = pd.read_csv(os.path.join(DATASET_DIR, 'Symptom-severity.csv'))
severity_df.columns = severity_df.columns.str.strip()
severity_df['Symptom'] = severity_df['Symptom'].str.strip()
severity_map = dict(zip(severity_df['Symptom'], severity_df['weight']))
print(f"  Severity weights: {len(severity_map)} symptoms")

# ── Load disease descriptions (merge both files) ──
description_map = {}

desc_path1 = os.path.join(DATASET_DIR, 'symptom_Description.csv')
if os.path.exists(desc_path1):
    desc_df = pd.read_csv(desc_path1)
    desc_df.columns = desc_df.columns.str.strip()
    desc_df = desc_df.apply(lambda col: col.str.strip() if col.dtype == 'object' else col)
    description_map.update(dict(zip(desc_df['Disease'], desc_df['Description'])))

desc_path2 = os.path.join(DATASET_DIR, 'description.csv')
if os.path.exists(desc_path2):
    desc_df2 = pd.read_csv(desc_path2)
    desc_df2.columns = desc_df2.columns.str.strip()
    desc_df2 = desc_df2.apply(lambda col: col.str.strip() if col.dtype == 'object' else col)
    for _, row in desc_df2.iterrows():
        disease = row['Disease'].strip() if 'Disease' in desc_df2.columns else ''
        desc_col = [c for c in desc_df2.columns if c.lower() == 'description']
        if desc_col and disease and disease not in description_map:
            description_map[disease] = str(row[desc_col[0]]).strip()
    print(f"  Merged descriptions from description.csv")

print(f"  Disease descriptions: {len(description_map)} diseases")

# ── Load precautions (merge both files) ──
precaution_map = {}

prec_path1 = os.path.join(DATASET_DIR, 'symptom_precaution.csv')
if os.path.exists(prec_path1):
    prec_df = pd.read_csv(prec_path1)
    prec_df.columns = prec_df.columns.str.strip()
    prec_df = prec_df.apply(lambda col: col.str.strip() if col.dtype == 'object' else col)
    for _, row in prec_df.iterrows():
        disease = row['Disease'].strip()
        precautions = []
        for i in range(1, 5):
            col = f'Precaution_{i}'
            if col in row and pd.notna(row[col]) and str(row[col]).strip():
                precautions.append(str(row[col]).strip())
        precaution_map[disease] = precautions

prec_path2 = os.path.join(DATASET_DIR, 'precautions_df.csv')
if os.path.exists(prec_path2):
    prec_df2 = pd.read_csv(prec_path2)
    prec_df2.columns = prec_df2.columns.str.strip()
    prec_df2 = prec_df2.apply(lambda col: col.str.strip() if col.dtype == 'object' else col)
    for _, row in prec_df2.iterrows():
        disease = row['Disease'].strip()
        if disease not in precaution_map:
            precautions = []
            for i in range(1, 5):
                col = f'Precaution_{i}'
                if col in row and pd.notna(row[col]) and str(row[col]).strip():
                    precautions.append(str(row[col]).strip())
            if precautions:
                precaution_map[disease] = precautions
    print(f"  Merged precautions from precautions_df.csv")

print(f"  Precautions: {len(precaution_map)} diseases")

# ── Load NEW: Medications ──
medication_map = {}
med_path = os.path.join(DATASET_DIR, 'medications.csv')
if os.path.exists(med_path):
    med_df = pd.read_csv(med_path)
    med_df.columns = med_df.columns.str.strip()
    for _, row in med_df.iterrows():
        disease = str(row['Disease']).strip()
        try:
            meds = ast.literal_eval(str(row['Medication']).strip())
            medication_map[disease] = meds
        except:
            medication_map[disease] = [str(row['Medication']).strip()]
    print(f"  Medications: {len(medication_map)} diseases")

# ── Load NEW: Diets ──
diet_map = {}
diet_path = os.path.join(DATASET_DIR, 'diets.csv')
if os.path.exists(diet_path):
    diet_df = pd.read_csv(diet_path)
    diet_df.columns = diet_df.columns.str.strip()
    for _, row in diet_df.iterrows():
        disease = str(row['Disease']).strip()
        try:
            diets = ast.literal_eval(str(row['Diet']).strip())
            diet_map[disease] = diets
        except:
            diet_map[disease] = [str(row['Diet']).strip()]
    print(f"  Diets: {len(diet_map)} diseases")

# ── Load NEW: Workouts ──
workout_map = {}
workout_path = os.path.join(DATASET_DIR, 'workout_df.csv')
if os.path.exists(workout_path):
    workout_df = pd.read_csv(workout_path)
    workout_df.columns = workout_df.columns.str.strip()
    # Group workouts by disease
    disease_col = [c for c in workout_df.columns if c.lower() == 'disease'][0]
    workout_col = [c for c in workout_df.columns if c.lower() == 'workout'][0]
    for disease, group in workout_df.groupby(disease_col):
        workouts = group[workout_col].dropna().tolist()
        workout_map[str(disease).strip()] = [str(w).strip() for w in workouts[:5]]
    print(f"  Workouts: {len(workout_map)} diseases")


# Get symptom columns
symptom_cols = [col for col in df.columns if col.startswith('Symptom')]
print(f"  Symptom columns: {len(symptom_cols)}")


# ══════════════════════════════════════════════════════════════════════
# STEP 2: Extract unique symptoms
# ══════════════════════════════════════════════════════════════════════

print("\n" + "=" * 60)
print("STEP 2: Extracting unique symptoms...")
print("=" * 60)

all_symptoms = set()
for col in symptom_cols:
    symptoms_in_col = df[col].dropna().unique()
    for s in symptoms_in_col:
        cleaned = str(s).strip().replace(' ', '_')
        if cleaned and cleaned != 'nan':
            all_symptoms.add(cleaned)

# Also add symptoms from severity map
for s in severity_map.keys():
    cleaned = str(s).strip().replace(' ', '_')
    if cleaned:
        all_symptoms.add(cleaned)

all_symptoms = sorted(list(all_symptoms))
print(f"  Found {len(all_symptoms)} unique symptoms")
print(f"  Examples: {all_symptoms[:5]}")


# ══════════════════════════════════════════════════════════════════════
# STEP 3: Build SEVERITY-WEIGHTED feature vectors
# ══════════════════════════════════════════════════════════════════════

print("\n" + "=" * 60)
print("STEP 3: Building severity-weighted feature vectors...")
print("=" * 60)

def build_feature_vector(row, use_weights=True):
    """Convert a row of symptom names into a weighted feature vector."""
    vector = np.zeros(len(all_symptoms), dtype=float)
    for col in symptom_cols:
        symptom = row[col]
        if pd.notna(symptom):
            symptom_clean = str(symptom).strip().replace(' ', '_')
            if symptom_clean in all_symptoms:
                idx = all_symptoms.index(symptom_clean)
                if use_weights:
                    weight = severity_map.get(symptom_clean, severity_map.get(symptom_clean.replace('_', ' '), 1))
                    vector[idx] = weight
                else:
                    vector[idx] = 1
    return vector

# Build feature matrix with severity weights
X = np.array([build_feature_vector(row, use_weights=True) for _, row in df.iterrows()])
print(f"  Feature matrix shape: {X.shape}  (samples × symptoms)")
non_zero = X[X > 0]
if len(non_zero) > 0:
    print(f"  Using severity weights (range: {non_zero.min():.0f} - {non_zero.max():.0f})")

# Encode disease labels
label_encoder = LabelEncoder()
y = label_encoder.fit_transform(df['Disease'])
print(f"  Classes: {len(label_encoder.classes_)}")


# ══════════════════════════════════════════════════════════════════════
# STEP 4: Data Augmentation (reduce overfitting)
# ══════════════════════════════════════════════════════════════════════

print("\n" + "=" * 60)
print("STEP 4: Data augmentation (symptom dropout)...")
print("=" * 60)

# Add augmented samples by randomly dropping 1-2 symptoms
np.random.seed(42)
augmented_X = []
augmented_y = []

for i in range(len(X)):
    non_zero_indices = np.where(X[i] > 0)[0]
    if len(non_zero_indices) > 2:
        # Create 2 augmented versions per sample
        for _ in range(2):
            aug = X[i].copy()
            n_drop = np.random.randint(1, min(3, len(non_zero_indices)))
            drop_indices = np.random.choice(non_zero_indices, size=n_drop, replace=False)
            aug[drop_indices] = 0
            augmented_X.append(aug)
            augmented_y.append(y[i])

X_aug = np.vstack([X, np.array(augmented_X)])
y_aug = np.concatenate([y, np.array(augmented_y)])
print(f"  Original samples: {len(X)}")
print(f"  Augmented samples: {len(augmented_X)}")
print(f"  Total training data: {len(X_aug)}")


# ══════════════════════════════════════════════════════════════════════
# STEP 5: Train-Test Split
# ══════════════════════════════════════════════════════════════════════

print("\n" + "=" * 60)
print("STEP 5: Splitting data (80% train / 20% test)...")
print("=" * 60)

X_train, X_test, y_train, y_test = train_test_split(
    X_aug, y_aug, test_size=0.2, random_state=42, stratify=y_aug
)
print(f"  Training samples: {len(X_train)}")
print(f"  Testing samples:  {len(X_test)}")


# ══════════════════════════════════════════════════════════════════════
# STEP 6: Train BOTH RandomForest & GradientBoosting, pick best
# ══════════════════════════════════════════════════════════════════════

print("\n" + "=" * 60)
print("STEP 6: Training classifiers...")
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


# ══════════════════════════════════════════════════════════════════════
# STEP 7: Evaluate
# ══════════════════════════════════════════════════════════════════════

print("\n" + "=" * 60)
print("STEP 7: Evaluating model performance...")
print("=" * 60)

cv_scores = cross_val_score(best_model, X_aug, y_aug, cv=5, scoring='accuracy')
print(f"\n  📊 Test Accuracy: {best_accuracy * 100:.2f}%")
print(f"  📊 Cross-Validation: {cv_scores.mean() * 100:.2f}% (±{cv_scores.std() * 100:.2f}%)")

print("\n  📋 Classification Report:")
report = classification_report(
    y_test, best_pred,
    target_names=label_encoder.classes_,
    zero_division=0
)
print(report)


# ══════════════════════════════════════════════════════════════════════
# STEP 8: Build NLP synonym mapping
# ══════════════════════════════════════════════════════════════════════

print("=" * 60)
print("STEP 8: Building NLP synonym mapping...")
print("=" * 60)

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
    "nodal skin": "nodal_skin_eruptions",
    "skin eruptions": "nodal_skin_eruptions",

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
    "hip pain": "hip_joint_pain",

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
    "malaise": "malaise",

    # Eyes
    "yellowish skin": "yellowish_skin",
    "yellow skin": "yellowish_skin",
    "yellow eyes": "yellowing_of_eyes",
    "blurred vision": "blurred_and_distorted_vision",
    "blurry vision": "blurred_and_distorted_vision",
    "vision problems": "blurred_and_distorted_vision",
    "red eyes": "redness_of_eyes",
    "watery eyes": "watering_from_eyes",
    "sunken eyes": "sunken_eyes",

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
    "obesity": "obesity",
    "overweight": "obesity",

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
    "smelly urine": "foul_smell_of_urine",

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
    "muscle wasting": "muscle_wasting",
    "patches in throat": "patches_in_throat",
    "extra marital contacts": "extra_marital_contacts",
    "pain behind eyes": "pain_behind_the_eyes",
    "toxic look": "toxic_look_(typhos)",
    "dischromic patches": "dischromic_patches",
    "spotting urination": "spotting_urination",
    "fluid overload": "fluid_overload",
    "distention of abdomen": "distention_of_abdomen",
    "belly bloating": "distention_of_abdomen",
    "abnormal menstruation": "abnormal_menstruation",
    "irregular periods": "abnormal_menstruation",
    "belly swollen": "swelling_of_stomach",
    "swollen stomach": "swelling_of_stomach",
    "blood in sputum": "blood_in_sputum",
    "coughing blood": "blood_in_sputum",
    "prominent veins": "prominent_veins_on_calf",
    "painful walking": "painful_walking",
    "skin bruising": "bruising",
    "small dents in nails": "small_dents_in_nails",
    "inflammatory nails": "inflammatory_nails",
    "altered sensorium": "altered_sensorium",
    "internal itching": "internal_itching",
    "receiving blood transfusion": "receiving_blood_transfusion",
    "receiving unsterile injections": "receiving_unsterile_injections",
    "rusty sputum": "rusty_sputum",
    "lack of concentration": "lack_of_concentration",
    "visual disturbances": "visual_disturbances",
    "coma": "coma",
    "stomach bleeding": "stomach_bleeding",
    "cold hands and feets": "cold_hands_and_feets",
    "cold hands": "cold_hands_and_feets",
    "cold feet": "cold_hands_and_feets",
    "throat swelling": "swelling_of_stomach",
    "silver like dusting": "silver_like_dusting",
    "red sore around nose": "red_sore_around_nose",
    "yellow crust ooze": "yellow_crust_ooze",
    "pain in anal region": "pain_in_anal_region",
    "irregular sugar": "irregular_sugar_level",
    "increased appetite": "increased_appetite",
    "polyuria": "polyuria",
    "watering from eyes": "watering_from_eyes",
}

print(f"  Built {len(symptom_synonyms)} synonym mappings")


# ══════════════════════════════════════════════════════════════════════
# STEP 9: Build disease info bundle (with medications, diets, workouts)
# ══════════════════════════════════════════════════════════════════════

print("\n" + "=" * 60)
print("STEP 9: Building disease info bundle...")
print("=" * 60)

# Classify disease severity
high_severity = [
    'AIDS', 'Heart attack', 'Paralysis (brain hemorrhage)',
    'Tuberculosis', 'Hepatitis B', 'Hepatitis C', 'Hepatitis D',
    'Hepatitis E', 'Dengue', 'Malaria', 'Typhoid', 'Pneumonia'
]

medium_severity = [
    'Diabetes ', 'Diabetes', 'Hypertension ', 'Hypertension', 'Jaundice',
    'Bronchial Asthma', 'Chronic cholestasis', 'Alcoholic hepatitis',
    'Hyperthyroidism', 'Hypothyroidism'
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

    # Get description
    desc = description_map.get(disease, '')
    if not desc:
        desc = description_map.get(disease.strip(), '')
    if not desc:
        for k, v in description_map.items():
            if k.lower().strip() == disease.lower().strip():
                desc = v
                break

    # Get precautions
    prec = precaution_map.get(disease, [])
    if not prec:
        prec = precaution_map.get(disease.strip(), [])
    if not prec:
        for k, v in precaution_map.items():
            if k.lower().strip() == disease.lower().strip():
                prec = v
                break

    # Get medications (NEW)
    meds = medication_map.get(disease, [])
    if not meds:
        for k, v in medication_map.items():
            if k.lower().strip() == disease.lower().strip():
                meds = v
                break

    # Get diets (NEW)
    diets = diet_map.get(disease, [])
    if not diets:
        for k, v in diet_map.items():
            if k.lower().strip() == disease.lower().strip():
                diets = v
                break

    # Get workouts (NEW)
    workouts = workout_map.get(disease, [])
    if not workouts:
        for k, v in workout_map.items():
            if k.lower().strip() == disease.lower().strip():
                workouts = v
                break

    disease_info[disease] = {
        "description": desc,
        "precautions": prec,
        "severity": severity,
        "medications": meds,
        "diets": diets,
        "workouts": workouts
    }

diseases_with_desc = sum(1 for d in disease_info.values() if d['description'])
diseases_with_prec = sum(1 for d in disease_info.values() if d['precautions'])
diseases_with_meds = sum(1 for d in disease_info.values() if d['medications'])
diseases_with_diets = sum(1 for d in disease_info.values() if d['diets'])
diseases_with_workouts = sum(1 for d in disease_info.values() if d['workouts'])

print(f"  Diseases with descriptions: {diseases_with_desc}/{len(disease_info)}")
print(f"  Diseases with precautions:  {diseases_with_prec}/{len(disease_info)}")
print(f"  Diseases with medications:  {diseases_with_meds}/{len(disease_info)}")
print(f"  Diseases with diets:        {diseases_with_diets}/{len(disease_info)}")
print(f"  Diseases with workouts:     {diseases_with_workouts}/{len(disease_info)}")
print(f"  Severity: High={sum(1 for d in disease_info.values() if d['severity']=='high')}, "
      f"Medium={sum(1 for d in disease_info.values() if d['severity']=='medium')}, "
      f"Low={sum(1 for d in disease_info.values() if d['severity']=='low')}")


# ══════════════════════════════════════════════════════════════════════
# STEP 10: Save all model artifacts
# ══════════════════════════════════════════════════════════════════════

print("\n" + "=" * 60)
print("STEP 10: Saving model artifacts...")
print("=" * 60)

# Preserve manually created files
preserve_files = ['medical_faq.json', 'followup_questions.json']
preserved = {}
for pf in preserve_files:
    pf_path = os.path.join(MODEL_DIR, pf)
    if os.path.exists(pf_path):
        with open(pf_path, 'r', encoding='utf-8') as f:
            preserved[pf] = f.read()

# Clean old model files
for old_file in os.listdir(MODEL_DIR):
    old_path = os.path.join(MODEL_DIR, old_file)
    if os.path.isfile(old_path):
        try:
            os.remove(old_path)
        except Exception:
            pass

# Restore preserved files
for pf, content in preserved.items():
    pf_path = os.path.join(MODEL_DIR, pf)
    with open(pf_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"  ✅ Preserved:             {pf}")

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
with open(symptoms_path, 'w', encoding='utf-8') as f:
    json.dump(all_symptoms, f, indent=2)
print(f"  ✅ Symptom list saved:    {symptoms_path}")

# Save severity weights
severity_path = os.path.join(MODEL_DIR, 'severity_weights.json')
with open(severity_path, 'w', encoding='utf-8') as f:
    json.dump(severity_map, f, indent=2)
print(f"  ✅ Severity weights saved:{severity_path}")

# Save disease info (with medications, diets, workouts)
disease_info_path = os.path.join(MODEL_DIR, 'disease_info.json')
with open(disease_info_path, 'w', encoding='utf-8') as f:
    json.dump(disease_info, f, indent=2)
print(f"  ✅ Disease info saved:    {disease_info_path}")

# Save synonym mapping
synonyms_path = os.path.join(MODEL_DIR, 'symptom_synonyms.json')
with open(synonyms_path, 'w', encoding='utf-8') as f:
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
    'n_samples_original': int(len(df)),
    'n_samples_augmented': int(len(X_aug)),
    'n_symptoms': int(len(all_symptoms)),
    'n_diseases': int(len(label_encoder.classes_)),
    'n_synonyms': int(len(symptom_synonyms)),
    'feature_type': 'severity_weighted',
    'augmentation': 'symptom_dropout',
    'datasets_used': ['dataset.csv', 'Training.csv'],
    'diseases': list(label_encoder.classes_)
}
metrics_path = os.path.join(MODEL_DIR, 'metrics.json')
with open(metrics_path, 'w', encoding='utf-8') as f:
    json.dump(metrics, f, indent=2)
print(f"  ✅ Metrics saved:         {metrics_path}")

print("\n" + "=" * 60)
print(f"🎉 TRAINING COMPLETE!")
print(f"   Best Model:      {best_name}")
print(f"   Accuracy:         {best_accuracy * 100:.2f}%")
print(f"   CV Accuracy:      {cv_scores.mean() * 100:.2f}% (±{cv_scores.std() * 100:.2f}%)")
print(f"   Original Data:    {len(df)} samples")
print(f"   Augmented Data:   {len(X_aug)} samples")
print(f"   Features:         Severity-weighted ({len(all_symptoms)} symptoms)")
print(f"   Diseases:         {len(label_encoder.classes_)}")
print(f"   Synonyms:         {len(symptom_synonyms)} NLP mappings")
print(f"   + Medications:    {diseases_with_meds} diseases")
print(f"   + Diets:          {diseases_with_diets} diseases")
print(f"   + Workouts:       {diseases_with_workouts} diseases")
print(f"   Saved to:         {MODEL_DIR}")
print("=" * 60)
