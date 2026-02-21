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
- [Screenshots](#-screenshots)
- [License](#-license)

---

## 🩺 About

**TracknHeal** is a full-stack healthcare web application that combines **AI-powered medical diagnosis** with **emergency ambulance booking** and **doctor appointment scheduling**. Users can describe their symptoms to a smart chatbot that uses a trained machine learning model to predict diseases across **41 conditions**, recommend specialists, and seamlessly connect them with available doctors or emergency services.

---

## ✨ Features

### 👤 Patient Portal
- **User Registration & Login** — Secure authentication with bcrypt password hashing
- **AI Medical Chatbot** — Describe symptoms in natural language and receive:
  - Disease prediction with confidence score
  - Specialist recommendation
  - Option to book an appointment with the suggested doctor
- **Ambulance Booking** — Book emergency ambulances with real-time status tracking
- **Doctor Directory** — Browse doctors by specialization, degree, and ratings
- **Appointment Scheduling** — Book appointments with preferred doctors
- **Booking History** — View and cancel past ambulance bookings and appointments

### 🔧 Admin Dashboard
- **Admin Authentication** — Secure admin login
- **Booking Management** — View, update status (pending → dispatched → completed), and manage all ambulance bookings
- **Appointment Management** — Confirm, complete, or cancel doctor appointments
- **Doctor Management** — Full CRUD operations (Add / Edit / Delete doctors)
- **User Management** — View registered users and their booking history
- **Dashboard Analytics** — Real-time statistics and counts for bookings and appointments

### 🤖 AI / ML Engine
- **Custom-trained ML model** (scikit-learn) for disease prediction
- **41 diseases** across 3 severity categories (Major, Moderate, Minor)
- **Natural language processing** — Extracts symptoms from conversational input
- **Specialist mapping** — Automatically maps predicted disease → recommended specialist
- **Flask microservice** running on port `5000` with REST API

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | HTML5, CSS3, JavaScript (Vanilla) |
| **Backend** | Node.js, Express.js |
| **Database** | MySQL |
| **ML Model** | Python, scikit-learn, Flask |
| **Auth** | bcrypt (password hashing) |
| **Other** | dotenv, CORS, body-parser |

---

## 📁 Project Structure

```
College_Proj/
├── server.js                  # Main Node.js/Express backend (690 lines)
├── package.json               # Node.js dependencies & scripts
├── .env                       # Environment variables (DB config, port)
│
├── public/                    # Frontend (served as static files)
│   ├── index.html             # Main patient-facing website
│   ├── admin.html             # Admin dashboard
│   ├── website-logo.jpeg      # Brand logo
│   └── Ambulance_Website_Background_Video.mp4
│
├── db/
│   └── tracknheal_db.sql      # Database schema & seed data
│
├── .ml/                       # Machine Learning module
│   ├── predict_server.py      # Flask prediction microservice
│   ├── train_model.py         # Model training script
│   ├── disease.ipynb          # Jupyter notebook for experimentation
│   ├── dataset/               # Training datasets (CSV)
│   └── model/                 # Trained model artifacts (.joblib)
│
└── DISEASES_LIST.md           # Documentation of all 41 supported diseases
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
pip install flask flask-cors numpy scikit-learn joblib
```

### 6. Start the ML Prediction Server

```bash
cd .ml
python predict_server.py
```

> The Flask server starts on `http://localhost:5000`

### 7. Start the Main Server

```bash
npm start
```

> The app is now running at `http://localhost:3000`

---

## 📡 API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/signup` | Register a new user |
| `POST` | `/login` | User login |
| `POST` | `/admin/login` | Admin login |

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
| `POST` | `/chat` | Send message to chatbot |

### ML Prediction Server (Port 5000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/predict` | Predict disease from symptoms |
| `GET` | `/symptoms` | List all recognized symptoms |
| `GET` | `/health` | Health check |

---

## 🤖 AI Chatbot

The chatbot uses a **custom-trained machine learning model** to diagnose diseases from user-described symptoms.

### How It Works

1. User describes symptoms in natural language (e.g., *"I have a headache and fever"*)
2. The chatbot extracts and matches symptoms from its database
3. The ML model predicts the most likely disease with a confidence score
4. A specialist recommendation is provided (e.g., *Cardiologist*, *Neurologist*)
5. The user can directly book an appointment with the recommended specialist

### Supported Disease Categories

| Category | Count | Examples |
|----------|-------|---------|
| 🔴 **Major** (Emergency) | 12 | Heart Attack, Tuberculosis, Dengue, Malaria |
| 🟠 **Moderate** | 8 | Diabetes, Hypertension, Asthma, Jaundice |
| 🟢 **Minor** | 21 | Common Cold, Acne, Migraine, Allergies |

> See [DISEASES_LIST.md](DISEASES_LIST.md) for the full list of 41 diseases.

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
└──────────────────┘     └──────────────────────────┘

┌──────────────────┐
│     admins       │
├──────────────────┤
│ id (PK)          │
│ username, email  │
│ password (hash)  │
└──────────────────┘
```

---

## 📸 Screenshots

*Screenshots coming soon — run the app locally to explore the full UI!*

---

## 📄 License

This project was built as a **college project** for academic purposes.

---

<p align="center">
  Made with ❤️ by the <b>TracknHeal</b> team
</p>
