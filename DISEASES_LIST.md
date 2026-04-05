# 🏥 Diseases Implemented in TrackNHeal Medical Chatbot

This document lists all **41 diseases** that the AI chatbot can diagnose based on user symptoms, along with recommended specialists and key symptoms.

---

## Disease Categories

### 🔴 High Severity — Requires Immediate Medical Attention

The chatbot flags these as emergencies and prompts the user to book an ambulance.

| # | Disease | Recommended Specialist | Key Symptoms |
|---|---------|----------------------|--------------|
| 1 | **AIDS** | General Physician | Muscle wasting, weight loss, high fever, patches in throat |
| 2 | **Heart Attack** | Cardiologist | Chest pain, breathlessness, sweating, vomiting |
| 3 | **Paralysis (Brain Hemorrhage)** | Neurologist | Weakness of one side, altered sensorium, headache |
| 4 | **Tuberculosis** | Pulmonologist | Persistent cough, blood in sputum, chest pain, weight loss |
| 5 | **Hepatitis B** | Hepatologist | Yellowing of eyes, dark urine, loss of appetite, abdominal pain |
| 6 | **Hepatitis C** | Hepatologist | Fatigue, nausea, yellowing skin, family history |
| 7 | **Hepatitis D** | Hepatologist | Joint pain, dark urine, nausea, yellowing of eyes |
| 8 | **Hepatitis E** | Hepatologist | High fever, nausea, dark urine, stomach pain |
| 9 | **Dengue** | General Physician | High fever, headache, pain behind eyes, skin rash, joint pain |
| 10 | **Malaria** | General Physician | Chills, high fever, sweating, headache, nausea |
| 11 | **Typhoid** | General Physician | High fever, fatigue, abdominal pain, constipation, diarrhoea |
| 12 | **Pneumonia** | Pulmonologist | Cough, high fever, chills, breathlessness, chest pain |

---

### 🟠 Medium Severity — Requires Medical Consultation

These conditions need a doctor visit but may not require emergency services.

| # | Disease | Recommended Specialist | Key Symptoms |
|---|---------|----------------------|--------------|
| 1 | **Diabetes** | Endocrinologist | Frequent urination, excessive hunger/thirst, fatigue, weight loss |
| 2 | **Hypertension** | Cardiologist | Headache, chest pain, dizziness, lack of concentration |
| 3 | **Jaundice** | Gastroenterologist | Yellow skin/eyes, dark urine, fatigue, itching |
| 4 | **Bronchial Asthma** | Pulmonologist | Cough, breathlessness, mucoid sputum, fatigue |
| 5 | **Chronic Cholestasis** | Gastroenterologist | Itching, vomiting, yellowing of eyes, nausea |
| 6 | **Alcoholic Hepatitis** | Hepatologist | Vomiting, yellowing of eyes, abdominal pain, fluid overload |
| 7 | **Hyperthyroidism** | Endocrinologist | Weight loss, restlessness, sweating, irritability, fast heart rate |
| 8 | **Hypothyroidism** | Endocrinologist | Fatigue, weight gain, cold hands, mood swings, puffy face |

---

### 🟢 Low Severity — Manageable with Medication & Home Care

These conditions can often be managed with OTC medication and lifestyle changes.

| # | Disease | Recommended Specialist | Key Symptoms |
|---|---------|----------------------|--------------|
| 1 | **Drug Reaction** | General Physician | Skin rash, itching, fever, stomach pain |
| 2 | **Allergy** | Dermatologist | Continuous sneezing, watering eyes, chills, shivering |
| 3 | **Psoriasis** | Dermatologist | Skin rash, skin peeling, joint pain, silver scaling |
| 4 | **GERD** | Gastroenterologist | Acidity, chest pain, ulcers on tongue, vomiting |
| 5 | **Hepatitis A** | Hepatologist | Joint pain, vomiting, yellowing of eyes, dark urine |
| 6 | **Osteoarthritis** | Orthopedic | Joint pain, neck/knee/hip pain, swelling joints |
| 7 | **Vertigo (BPPV)** | ENT Specialist | Dizziness, unsteadiness, spinning movements, nausea |
| 8 | **Hypoglycemia** | Endocrinologist | Anxiety, sweating, headache, blurred vision, irritability |
| 9 | **Acne** | Dermatologist | Skin rash, pus-filled pimples, blackheads, scarring |
| 10 | **Impetigo** | Dermatologist | Skin rash, high fever, blister, red sore around nose |
| 11 | **Peptic Ulcer Disease** | Gastroenterologist | Vomiting, loss of appetite, abdominal pain, passage of gases |
| 12 | **Hemorrhoids (Piles)** | Gastroenterologist | Constipation, pain during stool, bloody stool, irritation |
| 13 | **Common Cold** | General Physician | Continuous sneezing, cough, chills, fatigue, headache |
| 14 | **Chicken Pox** | General Physician | Itching, skin rash, fatigue, fever, red spots over body |
| 15 | **Cervical Spondylosis** | Neurologist | Back pain, neck pain, dizziness, weakness in limbs |
| 16 | **Urinary Tract Infection** | Urologist | Burning urination, bladder discomfort, foul smell of urine |
| 17 | **Varicose Veins** | Vascular Surgeon | Swollen legs, cramps, bruising, fatigue, obesity |
| 18 | **Fungal Infection** | Dermatologist | Itching, skin rash, nodal skin eruptions, dischromic patches |
| 19 | **Migraine** | Neurologist | Headache, acidity, visual disturbance, excessive hunger |
| 20 | **Arthritis** | Orthopedic | Muscle weakness, stiff joints, swelling, movement stiffness |
| 21 | **Gastroenteritis** | Gastroenterologist | Vomiting, diarrhoea, dehydration, sunken eyes |

---

## Model Details

| Metric | Value |
|--------|-------|
| **Algorithm** | Ensemble (RandomForest + GradientBoosting, best picked) |
| **Original Samples** | 9,882 (Merged `dataset.csv`, `Training.csv`, `Testing.csv`) |
| **Augmented Training Data** | 29,646 samples (using symptom dropout) |
| **Model Accuracy** | 99.80% |
| **Total Symptoms** | 136 (severity-weighted) |
| **NLP Synonyms** | 210+ natural language mappings |
| **Negation Detection** | ✅ Handles "I don't have fever" |
| **Follow-up Questions** | ✅ Asks if < 3 symptoms provided |
| **Doctor Recommendations** | ✅ Suggests available doctors from database |
| **Medical Guidance**| ✅ Suggests Medication, Diets, and Workouts per disease |

---

## Data Sources

The chatbot uses the following dataset files from `ml/dataset/`:

| File | Description |
|------|-------------|
| `dataset.csv` | Original Disease-symptom mapping (4,920 rows) |
| `Training.csv` & `Testing.csv`| Binary symptom mapping expanded datasets (4,964 combined rows) |
| `Symptom-severity.csv` | Severity weight for each symptom (132 entries) |
| `symptom_Description.csv` & `description.csv` | Textual description of each disease |
| `symptom_precaution.csv` & `precautions_df.csv` | 4 precautions per disease |
| `medications.csv` | Recommended medications per disease |
| `diets.csv` | Recommended dietary guidelines per disease |
| `workout_df.csv` | Recommended exercises/workouts per disease |

Additional model artifacts in `ml/model/`:

| File | Description |
|------|-------------|
| `medical_faq.json` | Medical knowledge + platform guidance FAQ |
| `followup_questions.json` | Follow-up questions for 15 symptom categories |
| `symptom_synonyms.json` | NLP synonym mappings (210+ entries) |
| `disease_info.json` | Combined info (description, precautions, medications, diets, workouts) |

---

## How It Works

```text
User Input ("I have fever and headache")
        │
        ▼
┌─────────────────────┐
│  NLP Extraction      │  ← Synonym mapping (210+ words), negation detection
│  + FAQ Check         │  ← Medical knowledge & platform guidance
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐      ┌──────────────────┐
│  Symptom Count < 3? │─YES─▶│ Ask Follow-ups   │
└────────┬────────────┘      └──────────────────┘
         │ NO
         ▼
┌─────────────────────┐
│  ML Prediction       │  ← Severity-weighted feature vectors
│  (RandomForest)      │  ← Multi-dataset merged (29,646 samples)
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Diagnosis Card      │
│  • Disease + Confidence
│  • Description       │
│  • Precautions       │
│  • Medications, Diets│
│  • Workouts          │
│  • Specialist        │
│  • Available Doctors │  ← Queried from database
│  • Top 3 Diagnoses   │
└─────────────────────┘
```

---

*Total: **41 diseases** with symptoms, descriptions, precautions, and specialist mappings*
