<p align="center">
  <img src="public/website-logo.jpeg" alt="TracknHeal Logo" width="120" />
</p>

<h1 align="center">🏥 TracknHeal</h1>

<p align="center">
  <b>AI-Powered Medical Assistance & Emergency Ambulance Booking Platform</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white" />
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white" />
  <img src="https://img.shields.io/badge/Scikit--Learn-F7931E?style=for-the-badge&logo=scikitlearn&logoColor=white" />
</p>

---

## 📋 Table of Contents

- [About](#-about)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [API Reference](#-api-reference)
- [AI Chatbot](#-ai-chatbot)
- [Database Schema](#-database-schema)
- [License](#-license)

---

## 🩺 About

**TracknHeal** is a full-stack healthcare web application that combines **AI-powered medical diagnosis** with **emergency ambulance booking** and **doctor appointment scheduling**. The platform features a multi-role authentication system (User, Admin, Doctor), a smart chatbot that uses a custom-trained ML model to diagnose **41 diseases** from natural language symptoms, and an admin dashboard for managing all operations.

---

## ✨ Features

### 👤 Patient Portal
- **User Registration & Login** — Secure authentication with bcrypt password hashing
- **AI Medical Chatbot** — Describe symptoms in natural language and receive:
  - Disease prediction with confidence score & severity level
  - Specialist recommendation with **available doctors from the database**
  - Medical guidelines (**Medications**, **Diets**, and **Workouts** directly in chat)
  - Follow-up questions for better diagnosis accuracy
  - Medical FAQ answers (e.g., "What is diabetes?")
  - Platform guidance (e.g., "How to book a doctor?")
  - One-click appointment booking from diagnosis results
- **Ambulance Booking** — Book emergency ambulances with real-time status tracking
- **Doctor Directory** — Browse doctors by specialization, degree, hospital, and ratings
- **Appointment Scheduling** — Book appointments with preferred doctors
- **Booking History** — View and cancel past ambulance bookings and appointments

### 🔧 Admin Dashboard
- **Admin Authentication** — Secure admin login
- **Booking Management** — View, update status (pending → dispatched → completed), and manage all ambulance bookings
- **Appointment Management** — Confirm, complete, or cancel doctor appointments
- **Doctor Management** — Full CRUD operations (Add / Edit / Delete doctors)
- **User Management** — View registered users and their booking history
- **Dashboard Analytics** — Real-time statistics and counts

### 👨‍⚕️ Doctor Portal
- **Doctor Registration** — Doctors can self-register with credentials (name, degree, specialization, hospital, availability)
- **Doctor Login** — Secure login with bcrypt-hashed passwords
- **My Patients View** — Doctors see only appointments booked under their name
- **Role-Aware UI** — "Book Appointment" buttons are hidden when a doctor is logged in

### 🤖 AI / ML Engine
- **Custom-trained ML model** (scikit-learn RandomForest ensemble with **99.80%** accuracy)
- Trained on **29,646 augmented samples** across **41 diseases**
- **136 symptoms** with severity-weighted feature vectors
- **NLP symptom extraction** — Extracts symptoms from conversational input with **210+ synonym mappings**
- **Negation detection** — "I don't have fever" correctly skips fever
- **Follow-up questions** — Asks clarifying questions when too few symptoms are provided (prevents misdiagnosis)
- **Medical FAQ** — Answers questions about diseases, prevention, and treatments
- **Platform guidance** — Helps users navigate the app (booking, login, services)
- **Doctor recommendation** — Queries the database for available specialists matching the diagnosis
- **Medical guidelines** — Injects suggested **Medications**, **Diets**, and **Workouts** directly into the diagnosis card
- **Flask microservice** running on port `5000` with REST API

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | HTML5, CSS3, JavaScript (Vanilla) |
| **Backend** | Node.js, Express.js |
| **Database** | MySQL |
| **ML Model** | Python, scikit-learn, Pandas, Flask |
| **Auth** | bcrypt (password hashing) |
| **Other** | dotenv, CORS, mysql2 |

---

## 📁 Project Structure

```
College_Proj/
├── server.js                  # Main Node.js/Express backend
├── package.json               # Node.js dependencies & scripts
├── requirements.txt           # Python dependencies
├── .env                       # Environment variables (DB config, port)
├── start.bat                  # Windows batch script to start both servers
│
├── public/                    # Frontend (served as static files)
│   ├── index.html             # Main patient-facing website + chatbot
│   ├── admin.html             # Admin dashboard
│   ├── website-logo.jpeg      # Brand logo
│   └── Ambulance_Website_Background_Video.mp4
│
├── db/
│   └── tracknheal_db.sql      # Database schema & seed data
│
├── ml/                        # Machine Learning module
│   ├── predict_server.py      # Flask prediction microservice (port 5000)
│   ├── train_model.py         # Model training script
│   ├── dataset/               # Training datasets (CSV)
│   │   ├── dataset.csv        # Symptom-disease dataset
│   │   ├── Training.csv & Testing.csv # Extended binary datasets
│   │   ├── medications.csv    # Disease medication mappings
│   │   ├── diets.csv          # Disease diet mappings
│   │   ├── workout_df.csv     # Disease workout mappings
│   │   ├── Symptom-severity.csv
│   │   ├── symptom_Description.csv
│   │   └── symptom_precaution.csv
│   └── model/                 # Trained model artifacts
│       ├── model.joblib        # Trained ML model
│       ├── label_encoder.joblib
│       ├── symptom_columns.json
│       ├── severity_weights.json
│       ├── symptom_synonyms.json
│       ├── disease_info.json   # Generated bundle (desc, precautions, meds, diets, workouts)
│       ├── medical_faq.json    # Medical & platform FAQ dataset
│       ├── followup_questions.json
│       └── metrics.json        # Training metrics
│
├── DISEASES_LIST.md           # Documentation of all 41 supported diseases
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18+)
- **Python** (3.8+)
- **MySQL** (8.0+)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/tracknheal.git
cd tracknheal
```

### 2. Set Up the Database

```bash
mysql -u root -p < db/tracknheal_db.sql
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=tracknheal_db
PORT=3000
```

### 4. Install Node.js Dependencies

```bash
npm install
```

### 5. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 6. Start the ML Prediction Server (Terminal 1)

```bash
python ml/predict_server.py
```

> The Flask server starts on `http://localhost:5000`

### 7. Start the Main Server (Terminal 2)

```bash
node server.js
```

> The app is now running at `http://localhost:3000`

### Access Points

| Page | URL |
|------|-----|
| **Homepage** | http://localhost:3000 |
| **Admin Panel** | http://localhost:3000/admin.html |
| **AI Chatbot** | Click the 💬 icon on the homepage |

### Default Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | *(as configured in DB)* | *(as configured)* |
| **Doctor** | *(any registered doctor email)* | `doctor123` |
| **User** | *(sign up from homepage)* | *(user-set)* |

---

## 📡 API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/signup` | Register a new user |
| `POST` | `/login` | User login |
| `POST` | `/admin/login` | Admin login |
| `POST` | `/doctor/login` | Doctor login |
| `POST` | `/doctor/signup` | Doctor registration |

### Ambulance Bookings

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/book` | Book an ambulance |
| `GET` | `/bookings/:id` | Get booking details |
| `GET` | `/user/bookings/:userId` | Get user's bookings |
| `PUT` | `/user/bookings/:bookingId/cancel` | Cancel a booking |

### Doctors

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/doctors` | List all doctors |
| `POST` | `/admin/doctors` | Add a new doctor |
| `PUT` | `/admin/doctors/:id` | Update doctor info |
| `DELETE` | `/admin/doctors/:id` | Remove a doctor |

### Doctor Appointments

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/appointments` | Book an appointment |
| `GET` | `/admin/appointments` | List all appointments |
| `PUT` | `/admin/appointments/:id/status` | Update appointment status |
| `GET` | `/admin/appointment-stats` | Get appointment statistics |
| `GET` | `/user/appointments/:userId` | Get user's appointments |
| `GET` | `/doctor/appointments/:doctorName` | Get doctor's patient appointments |

### Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin/bookings` | List all bookings |
| `PUT` | `/admin/bookings/:id/status` | Update booking status |
| `GET` | `/admin/stats` | Dashboard statistics |
| `GET` | `/admin/users` | List all users |
| `GET` | `/admin/users/:userId/bookings` | User's booking history |

### AI Chatbot

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/chat` | Send message to chatbot (supports accumulated symptoms) |

### ML Prediction Server (Port 5000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/analyze` | Full NLP + prediction pipeline (primary chatbot endpoint) |
| `POST` | `/predict` | Predict disease from symptom names |
| `POST` | `/nlp-extract` | Extract symptoms from natural text |
| `POST` | `/faq` | Medical & platform FAQ queries |
| `GET` | `/symptoms` | List all 131 recognized symptoms |
| `GET` | `/health` | Health check |

---

## 🤖 AI Chatbot

The chatbot uses a **custom-trained machine learning model** to diagnose diseases from user-described symptoms.

### How It Works

1. User describes symptoms in natural language (e.g., *"I have a headache and fever"*)
2. **NLP engine** extracts symptoms using synonym mapping, negation detection, and partial matching
3. If too few symptoms are found (< 3), the bot asks **follow-up questions** for better accuracy
4. With enough symptoms, the ML model predicts the most likely disease with a confidence score
5. The bot recommends a **specialist** and shows **available doctors** from the database
6. The user can **book an appointment** directly from the diagnosis card

### Chatbot Capabilities

| Feature | Example Input |
|---------|--------------|
| **Symptom Diagnosis** | "I have fever, headache, and nausea" |
| **Follow-up Questions** | "I have fever" → asks for more symptoms |
| **Medical FAQ** | "What is diabetes?" |
| **Platform Guidance** | "How to book a doctor?" |
| **Emergency Detection** | "I think I'm having a heart attack" |
| **Negation Handling** | "I don't have fever but I have headache" |

### Supported Disease Categories

| Category | Count | Examples |
|----------|-------|---------|
| 🔴 **High Severity** | 12 | Heart Attack, Tuberculosis, Dengue, Malaria, Pneumonia |
| 🟠 **Medium Severity** | 8 | Diabetes, Hypertension, Asthma, Jaundice |
| 🟢 **Low Severity** | 21 | Common Cold, Acne, Migraine, Allergies, GERD |

> See [DISEASES_LIST.md](DISEASES_LIST.md) for the full list of 41 diseases.

### ML Model Details

| Metric | Value |
|--------|-------|
| **Algorithm** | Ensemble (RandomForest + GradientBoosting) |
| **Training Samples** | 4,920 |
| **Features** | 131 severity-weighted symptom features |
| **Diseases** | 41 |
| **NLP Synonyms** | 164+ natural language mappings |
| **Follow-up Questions** | 15 symptom categories covered |

---

## 🗄 Database Schema

The application uses **5 MySQL tables**:

```
┌──────────────────┐     ┌──────────────────────────┐
│      users       │     │        bookings           │
├──────────────────┤     ├──────────────────────────┤
│ id (PK)          │◄────│ user_id (FK)              │
│ name             │     │ patient_name              │
│ email (UNIQUE)   │     │ phone, pickup, drop       │
│ password (hash)  │     │ emergency_type, status    │
└──────────────────┘     └──────────────────────────┘

┌──────────────────┐     ┌──────────────────────────┐
│     doctors      │     │  doctor_appointments      │
├──────────────────┤     ├──────────────────────────┤
│ id (PK)          │     │ user_id (FK → users)      │
│ name, degree     │     │ doctor_name, specialization│
│ specialization   │     │ patient_name, date, time  │
│ hospital, rating │     │ reason, status            │
│ password (hash)  │     └──────────────────────────┘
│ email, phone     │
└──────────────────┘

┌──────────────────┐
│     admins       │
├──────────────────┤
│ id (PK)          │
│ username, email  │
│ password (hash)  │
└──────────────────┘
```

---




