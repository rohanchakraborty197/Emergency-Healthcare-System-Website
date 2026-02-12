t# Diseases Implemented in TrackNHeal Medical Chatbot

This document lists all 41 diseases that the medical chatbot can diagnose based on user symptoms.

---

## Disease Categories

### 🔴 Major Diseases (High Severity - Requires Emergency Care)
These conditions are serious and the chatbot will recommend immediate medical attention:

1. **AIDS** - Acquired immunodeficiency syndrome caused by HIV
2. **Heart Attack** - Death of heart muscle due to loss of blood supply
3. **Paralysis (Brain Hemorrhage)** - Intracerebral hemorrhage causing brain damage
4. **Tuberculosis** - Infectious disease caused by Mycobacterium tuberculosis
5. **Hepatitis B** - Liver infection that can cause scarring and cancer
6. **Hepatitis C** - Liver inflammation caused by HCV
7. **Hepatitis D** - Liver inflammation caused by hepatitis delta virus
8. **Hepatitis E** - Liver inflammation from hepatitis E virus
9. **Dengue** - Acute infectious disease transmitted by aedes mosquitoes
10. **Malaria** - Infectious disease caused by Plasmodium parasites
11. **Typhoid** - Acute illness caused by Salmonella typhi
12. **Pneumonia** - Lung infection caused by bacteria, viruses, or fungi

---

### 🟠 Moderate Diseases (Medium Severity)
These conditions require medical consultation but may not be emergencies:

1. **Diabetes** - Blood glucose regulation disorder
2. **Hypertension** - High blood pressure
3. **Jaundice** - Yellowing of skin due to high bilirubin levels
4. **Bronchial Asthma** - Chronic airway inflammation
5. **Chronic Cholestasis** - Defective bile acid transport from liver
6. **Alcoholic Hepatitis** - Liver inflammation from heavy alcohol consumption
7. **Hyperthyroidism** - Overactive thyroid producing excess thyroxine
8. **Hypothyroidism** - Underactive thyroid not producing enough hormone

---

### 🟢 Minor Diseases (Lower Severity)
These conditions can often be managed with home care and medication:

1. **Drug Reaction** - Adverse reaction caused by medication
2. **Allergy** - Immune system response to foreign substances
3. **Psoriasis** - Skin disorder causing thick, red, bumpy patches
4. **GERD** - Gastroesophageal reflux disease (acid reflux)
5. **Hepatitis A** - Highly contagious liver infection
6. **Osteoarthritis** - Wear and tear arthritis affecting cartilage
7. **Vertigo (BPPV)** - Benign paroxysmal positional vertigo
8. **Hypoglycemia** - Low blood sugar
9. **Acne** - Skin condition with comedones and pustules
10. **Impetigo** - Contagious skin infection
11. **Peptic Ulcer Disease** - Break in stomach/intestine lining
12. **Hemorrhoids (Piles)** - Vascular structures in anal canal
13. **Common Cold** - Viral infection of nose and throat
14. **Chicken Pox** - Highly contagious disease caused by VZV
15. **Cervical Spondylosis** - Age-related wear of spinal disks
16. **Urinary Tract Infection** - Infection of kidney, ureter, bladder, or urethra
17. **Varicose Veins** - Enlarged and twisted veins
18. **Fungal Infection** - Infection caused by invading fungus
19. **Migraine** - Severe throbbing pain usually on one side of head
20. **Arthritis** - Swelling and tenderness of joints
21. **Gastroenteritis** - Inflammation of digestive tract

---

## Data Sources

The chatbot uses the following dataset files:
- `dataset/dataset.csv` - Disease-symptom mappings
- `dataset/symptom_Description.csv` - Disease descriptions
- `dataset/Symptom-severity.csv` - Symptom severity weights
- `dataset/symptom_precaution.csv` - Precautions for each disease

---

## How It Works

1. User describes their symptoms in natural language
2. Chatbot matches symptoms from the database
3. Disease scores are calculated based on matched symptoms and their weights
4. Top matching disease is identified
5. User receives:
   - Disease name and severity
   - Description of the condition
   - Recommended precautions
   - For major diseases: prompt to book emergency ambulance

---

*Total: 41 diseases with symptoms, descriptions, and precautions*
