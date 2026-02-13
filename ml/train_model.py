import os
import json
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import joblib


# ── Paths ──────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, '..', 'dataset')
MODEL_DIR = os.path.join(BASE_DIR, 'model')
os.makedirs(MODEL_DIR, exist_ok=True)


# ── Step 1: Load dataset ──────────────────────────────────────────────
print("=" * 60)
print("STEP 1: Loading dataset...")
print("=" * 60)

df = pd.read_csv(os.path.join(DATASET_DIR, 'dataset.csv'))
print(f"  Loaded {len(df)} rows, {len(df.columns)} columns")
print(f"  Diseases: {df['Disease'].nunique()}")

# Clean whitespace from all cells
df = df.apply(lambda col: col.str.strip() if col.dtype == 'object' else col)

# Get all symptom columns (Symptom_1 through Symptom_17)
symptom_cols = [col for col in df.columns if col.startswith('Symptom')]
print(f"  Symptom columns: {len(symptom_cols)}")


# ── Step 2: Extract unique symptoms ──────────────────────────────────
print("\n" + "=" * 60)
print("STEP 2: Extracting unique symptoms...")
print("=" * 60)

all_symptoms = set()
for col in symptom_cols:
    symptoms_in_col = df[col].dropna().unique()
    all_symptoms.update(symptoms_in_col)

# Remove empty strings
all_symptoms.discard('')
all_symptoms = sorted(list(all_symptoms))
print(f"  Found {len(all_symptoms)} unique symptoms")
print(f"  Examples: {all_symptoms[:5]}")


# ── Step 3: Build binary feature vectors ─────────────────────────────
print("\n" + "=" * 60)
print("STEP 3: Building binary feature vectors...")
print("=" * 60)

def build_feature_vector(row):
    """Convert a row of symptom names into a binary vector."""
    vector = np.zeros(len(all_symptoms), dtype=int)
    for col in symptom_cols:
        symptom = row[col]
        if pd.notna(symptom) and symptom in all_symptoms:
            idx = all_symptoms.index(symptom)
            vector[idx] = 1
    return vector

# Build feature matrix
X = np.array([build_feature_vector(row) for _, row in df.iterrows()])
print(f"  Feature matrix shape: {X.shape}  (samples × symptoms)")

# Encode disease labels
label_encoder = LabelEncoder()
y = label_encoder.fit_transform(df['Disease'])
print(f"  Classes: {len(label_encoder.classes_)}")
print(f"  Label mapping: {dict(zip(label_encoder.classes_[:5], range(5)))} ...")


# ── Step 4: Train-Test Split ────────────────────────────────────────
print("\n" + "=" * 60)
print("STEP 4: Splitting data (80% train / 20% test)...")
print("=" * 60)

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
print(f"  Training samples: {len(X_train)}")
print(f"  Testing samples:  {len(X_test)}")


# ── Step 5: Train Random Forest ──────────────────────────────────────
print("\n" + "=" * 60)
print("STEP 5: Training Random Forest classifier...")
print("=" * 60)

model = RandomForestClassifier(
    n_estimators=100,
    max_depth=None,
    min_samples_split=2,
    min_samples_leaf=1,
    random_state=42,
    n_jobs=-1  # Use all CPU cores
)

model.fit(X_train, y_train)
print("  ✅ Model trained successfully!")


# ── Step 6: Evaluate ─────────────────────────────────────────────────
print("\n" + "=" * 60)
print("STEP 6: Evaluating model performance...")
print("=" * 60)

# Test accuracy
y_pred = model.predict(X_test)
test_accuracy = accuracy_score(y_test, y_pred)
print(f"\n  📊 Test Accuracy: {test_accuracy * 100:.2f}%")

# Cross-validation
cv_scores = cross_val_score(model, X, y, cv=5, scoring='accuracy')
print(f"  📊 Cross-Validation Accuracy: {cv_scores.mean() * 100:.2f}% (±{cv_scores.std() * 100:.2f}%)")

# Classification report
print("\n  📋 Classification Report:")
report = classification_report(
    y_test, y_pred,
    target_names=label_encoder.classes_,
    zero_division=0
)
print(report)


# ── Step 7: Save model artifacts ─────────────────────────────────────
print("=" * 60)
print("STEP 7: Saving model artifacts...")
print("=" * 60)

# Save the trained model
model_path = os.path.join(MODEL_DIR, 'model.joblib')
joblib.dump(model, model_path)
print(f"  ✅ Model saved:         {model_path}")

# Save label encoder
encoder_path = os.path.join(MODEL_DIR, 'label_encoder.joblib')
joblib.dump(label_encoder, encoder_path)
print(f"  ✅ Label encoder saved: {encoder_path}")

# Save symptom list as JSON (for the prediction server)
symptoms_path = os.path.join(MODEL_DIR, 'symptom_columns.json')
with open(symptoms_path, 'w') as f:
    json.dump(all_symptoms, f, indent=2)
print(f"  ✅ Symptom list saved:  {symptoms_path}")

# Save training metrics
metrics = {
    'test_accuracy': float(test_accuracy),
    'cv_accuracy_mean': float(cv_scores.mean()),
    'cv_accuracy_std': float(cv_scores.std()),
    'n_samples': int(len(df)),
    'n_symptoms': int(len(all_symptoms)),
    'n_diseases': int(len(label_encoder.classes_)),
    'diseases': list(label_encoder.classes_)
}
metrics_path = os.path.join(MODEL_DIR, 'metrics.json')
with open(metrics_path, 'w') as f:
    json.dump(metrics, f, indent=2)
print(f"  ✅ Metrics saved:       {metrics_path}")

print("\n" + "=" * 60)
print(f"🎉 TRAINING COMPLETE!")
print(f"   Accuracy: {test_accuracy * 100:.2f}%")
print(f"   Model saved to: {MODEL_DIR}")
print("=" * 60)
