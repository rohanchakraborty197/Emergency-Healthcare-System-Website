# 🏥 TrackNHeal — Complete Setup Guide

Follow these steps to set up and run TrackNHeal on a new PC.

---

## Prerequisites

Install these before starting:

| Software | Version | Download |
|----------|---------|----------|
| **Node.js** | v20 or later | [nodejs.org](https://nodejs.org/) |
| **MySQL** | 8.0+ | [dev.mysql.com/downloads](https://dev.mysql.com/downloads/mysql/) |
| **Git** (optional) | Latest | [git-scm.com](https://git-scm.com/) |

---

## Step 1: Get the Project Files

**Option A — Clone from Git:**
```bash
git clone <your-repo-url>
cd College_Proj
```

**Option B — Copy the folder:**
Copy the entire `College_Proj` folder to your new PC. Make sure to **exclude** the `node_modules` folder (we'll install fresh).

---

## Step 2: Install Node.js Dependencies

Open a terminal in the project folder and run:

```bash
npm install
```

This installs all required packages: `express`, `mysql2`, `bcrypt`, `cors`, `dotenv`, `socket.io`, `@google/genai`.

---

## Step 3: Set Up MySQL Database

### 3.1 — Create the Database

Open MySQL command line or MySQL Workbench and run:

```sql
CREATE DATABASE tracknheal_db;
USE tracknheal_db;
```

### 3.2 — Create Tables

Run these SQL queries to create all required tables:

```sql
-- Users table
CREATE TABLE users (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY email (email)
);

-- Bookings table (ambulance bookings)
CREATE TABLE bookings (
    id INT NOT NULL AUTO_INCREMENT,
    patient_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    pickup_location VARCHAR(255) NOT NULL,
    drop_location VARCHAR(255) NOT NULL,
    emergency_type VARCHAR(100) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending','dispatched','completed','cancelled') DEFAULT 'pending',
    user_id INT DEFAULT NULL,
    PRIMARY KEY (id)
);

-- Doctors table
CREATE TABLE doctors (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    hospital VARCHAR(255) DEFAULT NULL,
    phone VARCHAR(20) DEFAULT NULL,
    email VARCHAR(255) DEFAULT NULL,
    available_days VARCHAR(100) DEFAULT 'Mon-Fri',
    available_time VARCHAR(50) DEFAULT '9:00 AM - 5:00 PM',
    rating DECIMAL(2,1) DEFAULT 4.0,
    image_url VARCHAR(500) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    degree VARCHAR(100) DEFAULT NULL,
    password VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (id)
);

-- Admins table
CREATE TABLE admins (
    id INT NOT NULL AUTO_INCREMENT,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY email (email)
);

-- Doctor appointments table (auto-created by server, but included for completeness)
CREATE TABLE IF NOT EXISTS doctor_appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    doctor_name VARCHAR(255) NOT NULL,
    specialization VARCHAR(255),
    doctor_degree VARCHAR(100),
    patient_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    appointment_date DATE NOT NULL,
    appointment_time VARCHAR(20) NOT NULL,
    reason TEXT,
    status ENUM('pending','confirmed','completed','cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Ambulance tracking table (auto-created by server, but included for completeness)
CREATE TABLE IF NOT EXISTS ambulance_tracking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    ambulance_lat DOUBLE NOT NULL,
    ambulance_lng DOUBLE NOT NULL,
    pickup_lat DOUBLE NOT NULL,
    pickup_lng DOUBLE NOT NULL,
    route_coords JSON,
    current_step INT DEFAULT 0,
    total_steps INT DEFAULT 0,
    status ENUM('dispatched','en_route','arrived','completed') DEFAULT 'dispatched',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);
```

### 3.3 — Insert Admin Account

```sql
INSERT INTO admins (username, email, password) VALUES
('Admin', 'admin@tracknheal.com', 'admin123');
```

> **Note:** The first time you log in as admin, use the password above. You can change it later.

### 3.4 — Insert Doctor Data

```sql
INSERT INTO doctors (name, specialization, degree, hospital, phone, email, available_days, available_time, rating) VALUES
('Dr. Arun Sharma', 'General Physician', 'MBBS, MD', 'City General Hospital', '9876543210', 'arun.sharma@hospital.com', 'Mon-Sat', '9:00 AM - 6:00 PM', 4.5),
('Dr. Rakesh Verma', 'General Physician', 'MBBS, MD', 'Woodland Hospital', '9876543216', 'rakesh.verma@tracknheal.com', 'Mon-Sat', '8:00 AM - 4:00 PM', 4.4),
('Dr. Rajesh Kumar', 'Cardiologist', 'MBBS, MD, DM', 'Heart Care Center', '9876543212', 'rajesh.kumar@heartcare.com', 'Mon-Sat', '8:00 AM - 4:00 PM', 4.7),
('Dr. Kavitha Nair', 'Neurologist', 'MBBS, MD, DM', 'Brain & Spine Center', '9876543215', 'kavitha.nair@neuro.com', 'Mon-Sat', '9:00 AM - 3:00 PM', 4.9),
('Dr. Amit Singh', 'Pulmonologist', 'MBBS, MD', 'Respiratory Care Hospital', '9876543214', 'amit.singh@respiratory.com', 'Mon-Fri', '10:00 AM - 6:00 PM', 4.4),
('Dr. Sneha Reddy', 'Gastroenterologist', 'MBBS, MD, DM', 'Digestive Health Institute', '9876543213', 'sneha.reddy@dhi.com', 'Tue-Sat', '9:00 AM - 5:00 PM', 4.6),
('Dr. Anita Desai', 'Endocrinologist', 'MBBS, MD, DM', 'Diabetes Care Center', '9876543217', 'anita.desai@diabetes.com', 'Wed-Sun', '10:00 AM - 6:00 PM', 4.7),
('Dr. Vikram Mehta', 'Orthopedic', 'MBBS, MS', 'Bone & Joint Hospital', '9876543216', 'vikram.mehta@ortho.com', 'Mon-Fri', '8:00 AM - 5:00 PM', 4.5),
('Dr. Priya Patel', 'Dermatologist', 'MBBS, DDVL', 'Skin Care Clinic', '9876543211', 'priya.patel@clinic.com', 'Mon-Fri', '10:00 AM - 5:00 PM', 4.3),
('Dr. Rohan Ghosh', 'Dermatologist', 'MBBS, MD, DDVL', 'Columbia Asia Hospital', '9876543218', 'rohan.ghosh@tracknheal.com', 'Tue-Sat', '11:00 AM - 7:00 PM', 4.3),
('Dr. Meena Krishnan', 'Hepatologist', 'MBBS, MD', 'Liver Care Institute', '9876543219', 'meena.krishnan@liver.com', 'Mon-Fri', '9:00 AM - 4:00 PM', 4.5),
('Dr. Pooja Chatterjee', 'Hepatologist', 'MBBS, MD, DM', 'SSKM Hospital', '9876543217', 'pooja.chatterjee@tracknheal.com', 'Mon-Fri', '10:00 AM - 6:00 PM', 4.5),
('Dr. Suresh Iyer', 'Infectious Disease', 'MBBS, MD', 'Tropical Medicine Hospital', '9876543218', 'suresh.iyer@tropical.com', 'Mon-Sat', '9:00 AM - 5:00 PM', 4.6),
('Dr. Sanjay Bose', 'Urologist', 'MBBS, MS, MCh', 'Apollo Hospitals', '9876543210', 'sanjay.bose@tracknheal.com', 'Mon-Fri', '10:00 AM - 4:00 PM', 4.6),
('Dr. Pallavi Joshi', 'Urologist', 'MBBS, MS', 'Ruby General Hospital', '9876543211', 'pallavi.joshi@tracknheal.com', 'Mon-Sat', '9:00 AM - 5:00 PM', 4.3),
('Dr. Arjun Malhotra', 'Vascular Surgeon', 'MBBS, MS, MCh', 'Fortis Hospital', '9876543212', 'arjun.malhotra@tracknheal.com', 'Mon-Fri', '11:00 AM - 6:00 PM', 4.5),
('Dr. Ritu Kapoor', 'Vascular Surgeon', 'MBBS, MS', 'Medica Superspecialty', '9876543213', 'ritu.kapoor@tracknheal.com', 'Tue-Sat', '10:00 AM - 5:00 PM', 4.2),
('Dr. Nikhil Sen', 'ENT Specialist', 'MBBS, MS (ENT)', 'AMRI Hospital', '9876543214', 'nikhil.sen@tracknheal.com', 'Mon-Sat', '9:00 AM - 3:00 PM', 4.7),
('Dr. Swati Banerjee', 'ENT Specialist', 'MBBS, DLO', 'Belle Vue Clinic', '9876543215', 'swati.banerjee@tracknheal.com', 'Mon-Fri', '10:00 AM - 5:00 PM', 4.4);
```

---

## Step 4: Configure Environment Variables

Create or edit the `.env` file in the project root:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=tracknheal_db
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
```

### Getting a Gemini API Key (Free)

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the key and paste it in `.env` as `GEMINI_API_KEY`

> The free tier gives 15 requests/minute — more than enough for development and demos.

---

## Step 5: Run the Server

```bash
npm start
```

You should see:
```
✅ Server running at http://localhost:3000
✅ MySQL Connected
✅ doctor_appointments table ready
✅ doctors.password column ready
✅ doctor_appointments.doctor_degree column ready
✅ ambulance_tracking table ready
```

Open your browser and go to **http://localhost:3000** 🎉

---

## Project Structure

```
College_Proj/
├── server.js              ← Main backend (Express + Gemini AI chatbot)
├── package.json           ← Node.js dependencies
├── .env                   ← Environment variables (DB + API key)
├── .gitignore
├── README.md
├── DISEASES_LIST.md       ← List of 41 supported diseases
├── Project setup File.md  ← This file
│
├── public/                ← Frontend files
│   ├── html/
│   │   ├── index.html     ← Main website (homepage, chatbot, booking)
│   │   ├── admin.html     ← Admin dashboard
│   │   └── tracking.html  ← Live ambulance tracking page
│   ├── css/
│   │   ├── index.css      ← Main website styles
│   │   ├── admin.css      ← Admin dashboard styles
│   │   └── tracking.css   ← Tracking page styles
│   └── assets/            ← Images, videos
│
├── ml/                    ← Medical data (used by AI chatbot)
│   ├── model/
│   │   ├── disease_info.json      ← Disease descriptions, meds, diets
│   │   ├── medical_faq.json       ← FAQ responses
│   │   └── ... (other model files)
│   ├── dataset/           ← Training datasets (reference only)
│   ├── predict_server.py  ← Old ML server (retired, kept as backup)
│   └── train_model.py     ← Old model training (retired, kept as backup)
│
└── db/                    ← Database related files
```

---

## Features Overview

| Feature | URL | Description |
|---------|-----|-------------|
| **Homepage** | `http://localhost:3000` | Main site with ambulance booking, doctor listing |
| **AI Chatbot** | Floating widget (bottom-right) | Gemini-powered medical assistant |
| **Admin Dashboard** | `http://localhost:3000/admin.html` | Manage bookings, doctors, users |
| **Live Tracking** | `http://localhost:3000/tracking.html?bookingId=X` | Real-time ambulance tracking |

---

## Login Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@tracknheal.com` | `admin123` |
| **User** | Sign up from the homepage | — |
| **Doctor** | Sign up from Doctor tab in login modal | — |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `MySQL not connected` | Check `.env` credentials match your MySQL setup |
| `Chatbot shows error` | Verify `GEMINI_API_KEY` in `.env` is valid |
| `Gemini quota exceeded` | Wait a minute (free tier: 15 req/min) or get a new key |
| `npm install fails` | Make sure Node.js v20+ is installed |
| `Port 3000 in use` | Change `PORT` in `.env` or kill the process using port 3000 |
| `bcrypt build error` | Run `npm rebuild bcrypt` or install Python + Visual Studio Build Tools |

---

## Quick Start Summary

```bash
# 1. Install dependencies
npm install

# 2. Set up MySQL (create DB + run table SQL + insert data)

# 3. Edit .env with your MySQL password and Gemini API key

# 4. Start the server
npm start

# 5. Open http://localhost:3000
```
