<p align="center">
  <img src="public/website-logo.jpeg" alt="TracknHeal Logo" width="120" />
</p>

<h1 align="center">🏥 TracknHeal</h1>

<p align="center">
  <b>Advanced AI-Powered Medical Assistance, Smart Diagnostics & Ambulance Dispatch Platform</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white" />
  <img src="https://img.shields.io/badge/Gemini_API-8E44AD?style=for-the-badge&logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white" />
  <img src="https://img.shields.io/badge/Scikit--Learn-F7931E?style=for-the-badge&logo=scikitlearn&logoColor=white" />
</p>

---

## 📋 Table of Contents

- [About](#-about)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [API Reference](#-api-reference)
- [AI Chatbot Ecosystem](#-ai-chatbot-ecosystem)
- [Ambulance Dispatch & Fleet System](#-ambulance-dispatch--fleet-system)
- [Database Schema](#-database-schema)
- [License](#-license)

---

## 🩺 About

**TracknHeal** is an advanced, full-stack healthcare web application that bridges the gap between **intelligent AI-driven clinical diagnostics** and **real-time emergency response**. 

The platform leverages **Google Gemini 2.5 Flash** alongside a **custom RandomForest ML model** to provide clinical diagnosis and lifestyle recommendations based on natural language symptoms. Beyond diagnostics, it integrates a comprehensive **Ambulance Booking & Ride-Hailing System**—complete with a dedicated **Driver Portal**, dynamic pricing/fares, a rating system, and an **Admin Fleet Management Dashboard**—and a **Doctor Portal** for managing appointments and directories.

---

## ✨ Key Features

### 👤 Patient Portal
- **Secure Authentication** — Sign up and login for patients with bcrypt password hashing.
- **Ambulance Booking** — Book emergency ambulances with dynamic pricing/fare computation, live route status, and post-ride driver rating (1-5 stars).
- **Doctor Directory** — Browse local doctors by specialization, degree, hospital, availability, and rating.
- **Doctor Appointments** — Schedule visits and view active/past bookings in a unified timeline.

### 🤖 AI Medical Assistant (Gemini-Powered)
- **Multi-Turn Conversation** — Natural language conversation with an in-memory session manager that remembers clinical context across messages (up to 20 turns, 30 min expiration).
- **Hybrid AI/ML Engine** — Combines local symptom extraction and RandomForest classification (99.8% accuracy) with **Gemini 2.5 Flash** for clinical dialogue, negation handling, and FAQs.
- **Rich Diagnosis Cards** — Custom color-coded clinical cards:
  - Disease identification, confidence metrics, and severity level (🔴 High, 🟠 Medium, 🟢 Low).
  - Custom lifestyle guidance (**Medications**, **Diets**, and **Workouts** mapped dynamically).
  - Recommended specialists based on predicted disease.
- **Database Doctor Mapping** — Direct link to the database to fetch **real available doctors** matching the recommended specialist specialization in real-time.
- **One-Click Actions** — Instant buttons inside diagnosis cards to book an appointment or book an emergency ambulance directly.
- **Premium UI Details** — Smooth animated typing indicators, custom bot/user avatars, HH:MM message timestamps, and a header **"Clear Chat"** control to purge session memory.

### 👨‍⚕️ Doctor Portal
- **Self-Registration & Profile** — Doctors can register with credentials, specialization, degree, hospital, availability days, and times.
- **My Patients View** — Specialized dashboard lists appointments scheduled under their name.
- **Role-Aware UI** — Dynamic element display (hides patient booking buttons when a doctor is logged in).

### 🚑 Ambulance Driver Portal & Ride-Hailing
- **Driver Dashboard** — Dedicated mobile-responsive driver portal (`driver-dashboard.html`) to manage incoming emergency bookings.
- **Booking Status Lifecycle** — Drivers can accept rides, transition statuses (`dispatched` → `en_route` → `arrived` → `dropping` → `completed`), and complete trips.
- **Dynamic Fare Generator** — Generates fares automatically upon ride completion (based on emergency urgency and trip metrics).
- **Live Performance Metrics** — Real-time tracking of driver statistics: **Lifetime Trips**, **My Rating (Average)**, and **Total Earnings (₹)**.

### 🔧 Admin & Fleet Dashboard
- **Admin Authentication** — Secure portal (`admin.html`) for hospital administrators.
- **Fleet & Driver Dashboard** — Dedicated fleet view to monitor active drivers, online/busy/offline statuses, ratings, earnings, and vehicle assignments.
- **User & Doctor CRUD** — Full operational control over registered users, doctor listings, and administrative analytics.
- **Booking & Appointment Controls** — Confirm, complete, dispatch, or cancel bookings and appointments.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | HTML5, CSS3 (Vanilla Custom Flexbox & Gradients), JavaScript (Vanilla ES6) |
| **Backend** | Node.js, Express.js |
| **Database** | MySQL |
| **AI LLM Engine** | Gemini 2.5 Flash (via `@google/genai`) |
| **ML Microservice** | Python 3, Flask, scikit-learn, Pandas, Joblib |
| **WebSockets** | Socket.io (for real-time dispatch and notification triggers) |
| **Maps & Routing** | Leaflet.js, OpenStreetMap Nominatim Geocoding API |
| **Security** | dotenv, bcrypt (password hashing), CORS |

---

## 📁 Project Structure

```
College_Proj/
├── server.js                  # Main Node.js/Express backend (serves static files, manages DB/Auth/APIs)
├── package.json               # Node.js dependencies, metadata, & scripts
├── requirements.txt           # Python packages for ML microservice
├── .env                       # Environment variables (DB credentials, Gemini API key, server port)
├── start.bat                  # Shell batch script to spin up both servers (Node.js + Flask)
│
├── public/                    # Static Assets & Pages
│   ├── index.html             # Patient Portal homepage + unified AI Chatbot widget
│   ├── admin.html             # Hospital Admin dashboard
│   ├── driver-dashboard.html  # Ambulance Driver dashboard
│   ├── tracking.html          # Ambulance map tracking interface
│   ├── website-logo.jpeg      # Brand assets
│   ├── css/
│   │   ├── index.css          # Homepage & Chatbot styling (avatars, typing animations, dialogs)
│   │   ├── admin.css          # Admin panel layout
│   │   └── driver.css         # Mobile-responsive driver portal layouts
│   └── Ambulance_Website_Background_Video.mp4
│
├── db/
│   └── tracknheal_db.sql      # Database schema, foreign key relations, & bootstrap seed data
│
├── ml/                        # Machine Learning Module
│   ├── predict_server.py      # Flask prediction microservice (port 5000)
│   ├── train_model.py         # Model training script
│   ├── dataset/               # Symptom-disease datasets
│   │   ├── dataset.csv        # Core disease-symptom relation data
│   │   ├── Training.csv       # Training binary vectors
│   │   ├── Testing.csv        # Test binary vectors
│   │   ├── medications.csv    # Disease-to-Medication mappings
│   │   ├── diets.csv          # Disease-to-Diet guidelines
│   │   ├── workout_df.csv     # Disease-to-Workout instructions
│   │   └── Symptom-severity.csv
│   └── model/                 # Serialized ML artifacts
│       ├── model.joblib        # Trained Random Forest ensemble
│       ├── label_encoder.joblib
│       ├── symptom_columns.json
│       ├── disease_info.json   # Consolidated disease dictionary (descriptions, precautions, medications, workouts)
│       └── medical_faq.json    # Local medical FAQ & platform guidance records
│
├── DISEASES_LIST.md           # Documentation of the 41 supported clinical diseases
└── README.md                  # Detailed platform documentation
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- **Node.js** (v18.0.0 or higher)
- **Python** (v3.8 or higher)
- **MySQL** (v8.0 or higher)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/tracknheal.git
cd tracknheal
```

### 2. Configure environment variables
Create a `.env` file in the root directory:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=tracknheal_db
PORT=3000
GEMINI_API_KEY=your_google_gemini_api_key
```

### 3. Load the MySQL Database
Import the schema and bootstrap data:
```bash
mysql -u root -p < db/tracknheal_db.sql
```

### 4. Install Project Dependencies
**Node.js Express backend:**
```bash
npm install
```

**Python Flask ML microservice:**
```bash
pip install -r requirements.txt
```

### 5. Spin Up the Platform
We provide a simple Windows batch script to launch both servers simultaneously:
```bash
start.bat
```
Alternatively, open two separate terminals:
- **Terminal 1 (Flask ML):** `python ml/predict_server.py` (runs on port 5000)
- **Terminal 2 (Express Web Server):** `node server.js` (runs on port 3000)

### Access Points

| Portal / Interface | URL | Access Details |
|--------------------|-----|----------------|
| **Patient Portal** | `http://localhost:3000` | Sign up / Log in directly on the homepage |
| **AI Medical Assistant** | Click the 🤖 icon on homepage | Persists session automatically on load |
| **Driver Portal** | `http://localhost:3000/html/driver-login.html` | Log in as driver (Default credentials in DB) |
| **Admin Dashboard** | `http://localhost:3000/admin.html` | Access hospital-wide analytics |

---

## 📡 API Reference

### 🔐 Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/signup` | Register a new patient account |
| `POST` | `/login` | Patient login (returns session details) |
| `POST` | `/admin/login` | Secure administrator access |
| `POST` | `/doctor/signup` | Doctor registration |
| `POST` | `/doctor/login` | Doctor dashboard login |
| `POST` | `/driver/signup` | Register an ambulance driver |
| `POST` | `/driver/login` | Ambulance driver login |

### 🤖 AI Chatbot (Gemini & Multi-Turn)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/chat` | Submits conversational message, processes memory session, queries Gemini, parses diagnostics, and queries doctor availability |
| `POST` | `/chat/clear` | Purges the in-memory conversation history for the specified `sessionId` |

### 👨‍⚕️ Doctors & Appointments

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/doctors` | Lists all registered doctors |
| `GET` | `/doctors/specialization/:spec` | Fetches available doctors matching a specialization |
| `POST` | `/appointments` | Schedule a new doctor appointment |
| `GET` | `/doctor/appointments/:doctorName`| Fetches appointments booked for a specific doctor |
| `GET` | `/user/appointments/:userId` | Retrieves a patient's historical appointments |

### 🚑 Ambulance Ride-Hailing & Drivers

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/book` | Request an emergency ambulance booking |
| `GET` | `/user/bookings/:userId` | Fetch a patient's active/past bookings |
| `PUT` | `/user/bookings/:bookingId/rate` | Submit user feedback rating (1-5 stars) for the driver |
| `GET` | `/driver/rides/:driverId` | Fetch active emergency ride assigned to a driver |
| `GET` | `/driver/history/:driverId` | Fetch driver's lifetime trip logs |
| `PUT` | `/driver/rides/:bookingId/accept` | Driver accepts booking (locks ambulance, calculates dynamic fare) |
| `PUT` | `/driver/rides/:bookingId/complete` | Driver completes ride (records trip, logs earnings, releases vehicle) |
| `GET` | `/driver/stats/:driverId` | Retrieves driver analytics (trips, ratings, earnings) |
| `PUT` | `/driver/status/:driverId` | Set driver status (`available`, `busy`, `offline`) |

---

## 🤖 AI Chatbot Ecosystem

TracknHeal features a sophisticated dual-AI framework that combines standard neural dialogue with custom diagnostic mapping.

```
                  ┌───────────────────────────────────────────┐
                  │          Patient describes symptom        │
                  └─────────────────────┬─────────────────────┘
                                        ▼
                  ┌───────────────────────────────────────────┐
                  │   Express Backend (/chat + Session ID)    │
                  └─────────────────────┬─────────────────────┘
                                        ▼
                  ┌───────────────────────────────────────────┐
                  │    Google Gemini 2.5 Flash LLM Pipeline   │
                  │   - Assesses session history (max 20)     │
                  │   - Formulates JSON diagnostic struct     │
                  └─────────────────────┬─────────────────────┘
                                        ▼
                  ┌───────────────────────────────────────────┐
                  │       Gemini Clinical Output Parser       │
                  └───────┬───────────────────────────┬───────┘
                          │ (Clinical Diagnosis)      │ (FAQ / Dialogue)
                          ▼                           ▼
        ┌───────────────────────────────────┐       ┌──────────────────────┐
        │   Fuzzy Match to local ML Db:     │       │   Return Gemini      │
        │   - Pull description/precautions  │       │   conversational reply │
        │   - Fetch custom Diets & Workouts │       │   with suggestions   │
        │   - Identify matching Specialist  │       └──────────────────────┘
        └─────────────────┬─────────────────┘
                          ▼
        ┌───────────────────────────────────┐
        │   MySQL Doctors Table Query:      │
        │   - Fetch top 3 available doctors │
        │   - Check active ratings/schedule │
        │   - Format direct booking options │
        └─────────────────┬─────────────────┘
                          ▼
        ┌───────────────────────────────────┐
        │   Render Rich Diagnostic Card:    │
        │   - Action: book doc/ambulance    │
        │   - Guidelines: medications/diet  │
        └───────────────────────────────────┘
```

### Session parameters
- **Conversation State**: Session histories are stored in-memory using an Express Map (`conversationSessions`).
- **Memory Length**: Restricts to the last **20 dialogue turns** to maintain prompt performance.
- **TTL (Time to Live)**: Purges conversation history automatically after **30 minutes of inactivity** to optimize memory.

---

## 🚑 Ambulance Dispatch & Fleet System

The ambulance booking module acts as a complete micro-dispatch workflow:
1. **Request**: Patient requests a ride. The system flags the booking status as `pending`.
2. **Acceptance**: Drivers check their portal (`driver-dashboard.html`) and accept the ride. 
   - The system locks the vehicle status to `busy`.
   - Generates a **dynamic fare** (calculated on booking severity).
   - Links the driver's ID and ambulance details to the booking.
3. **Fulfillment**: The driver transitions state (`dispatched` → `en_route` → `arrived` → `completed`).
   - On completion, the system logs the fare into **Driver Earnings** and increments their **Lifetime Trips**.
   - The ambulance and driver status reset back to `available`.
4. **Rating**: Patients review completed bookings from their profile dashboard and submit a rating (1-5).
   - This triggers an **incremental rating calculation** in the backend:
     $$\text{New Rating} = \frac{(\text{Current Avg} \times \text{Total Ratings}) + \text{New Rating}}{\text{Total Ratings} + 1}$$
   - Instantly updates the driver's public portfolio and admin dashboards.

---

## 🗄 Database Schema

The platform is structured on **8 interconnected tables** within MySQL:

```
                  ┌──────────────────────────────┐
                  │            users             │
                  ├──────────────────────────────┤
                  │ id INT (PK, AI)              │
                  │ name VARCHAR(255)            │
                  │ email VARCHAR(255) (UNIQUE)  │
                  │ password VARCHAR(255) (Hash) │
                  │ role VARCHAR(50)             │
                  └──────────────┬───────────────┘
                                 │
         ┌───────────────────────┴───────────────────────┐
         │                                               │
         ▼                                               ▼
┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│            bookings             │     │       doctor_appointments       │
├─────────────────────────────────┤     ├─────────────────────────────────┤
│ id INT (PK, AI)                 │     │ id INT (PK, AI)                 │
│ user_id INT (FK -> users)       │     │ user_id INT (FK -> users)       │
│ patient_name VARCHAR(255)       │     │ doctor_id INT (FK -> doctors)   │
│ phone VARCHAR(20)               │     │ doctor_name VARCHAR(255)        │
│ pickup_location VARCHAR(255)    │     │ specialization VARCHAR(255)     │
│ drop_location VARCHAR(255)      │     │ patient_name VARCHAR(255)       │
│ emergency_type VARCHAR(100)     │     │ date DATE                       │
│ status ENUM('pending'...)       │     │ time VARCHAR(50)                │
│ assigned_ambulance_id INT (FK)  │     │ reason TEXT                     │
│ assigned_driver_id INT (FK)     │     │ status VARCHAR(50)              │
│ fare DECIMAL(10,2)              │     └─────────────────────────────────┘
│ driver_rating INT               │
└─────────────────────────────────┘

┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│            doctors              │     │             admins              │
├─────────────────────────────────┤     ├─────────────────────────────────┤
│ id INT (PK, AI)                 │     │ id INT (PK, AI)                 │
│ name VARCHAR(255)               │     │ username VARCHAR(255)           │
│ specialization VARCHAR(255)     │     │ email VARCHAR(255)              │
│ degree VARCHAR(255)             │     │ password VARCHAR(255) (Hash)    │
│ hospital VARCHAR(255)           │     └─────────────────────────────────┘
│ rating FLOAT                    │
│ email VARCHAR(255)              │
│ password VARCHAR(255) (Hash)    │
└─────────────────────────────────┘

┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│           ambulances            │     │        ambulance_drivers        │
├─────────────────────────────────┤     ├─────────────────────────────────┤
│ id INT (PK, AI)                 │     │ id INT (PK, AI)                 │
│ vehicle_number VARCHAR(50)      │     │ name VARCHAR(255)               │
│ type VARCHAR(50)                │     │ phone VARCHAR(20)               │
│ status ENUM('available'...)     │     │ email VARCHAR(255)              │
│ driver_name VARCHAR(255)        │     │ password VARCHAR(255) (Hash)    │
│ driver_phone VARCHAR(20)        │     │ status ENUM('available'...)     │
└─────────────────────────────────┘     │ vehicle_id INT                  │
                                        │ rating FLOAT (Avg)              │
                                        │ total_ratings INT               │
                                        │ total_trips INT                 │
                                        │ total_earnings DECIMAL(10,2)    │
                                        └─────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│                   ambulance_tracking                   │
├────────────────────────────────────────────────────────┤
│ id INT (PK, AI)                                        │
│ booking_id INT (FK -> bookings)                        │
│ status ENUM('dispatched', 'en_route', 'arrived'...)    │
│ latitude DECIMAL(9,6)                                  │
│ longitude DECIMAL(9,6)                                 │
│ last_updated TIMESTAMP                                 │
└────────────────────────────────────────────────────────┘
```

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.
