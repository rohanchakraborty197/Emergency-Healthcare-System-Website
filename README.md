# 🚑 TracknHeal - Complete Project Documentation

TracknHeal is a comprehensive, real-time web-based healthcare and emergency response platform. It acts as a bridge connecting patients, specialized doctors, hospitals, and ambulance drivers to provide a seamless ecosystem for medical emergencies and appointments.

---

## 📑 Table of Contents

1. [System Architecture](#system-architecture)
2. [Core Modules](#core-modules)
3. [Database Schema](#database-schema)
4. [Real-Time Infrastructure](#real-time-infrastructure)
5. [Directory Structure](#directory-structure)
6. [Setup & Installation](#setup--installation)

---

## 🏗️ System Architecture

TracknHeal is built on a robust, lightweight stack ensuring quick response times and high availability.

* **Frontend:** HTML5, CSS3, Vanilla JavaScript
* **Backend:** Node.js, Express.js
* **Database:** MySQL
* **Real-time Communication:** Socket.io
* **Authentication & Security:** bcrypt (Password Hashing), Nodemailer (OTP-based Email Verification)
* **API Architecture:** RESTful APIs mixed with WebSocket events for real-time dashboards.

---

## 🧩 Core Modules

The platform is divided into five distinct modules tailored for different stakeholders:

### 1. User Portal (`index.html`, `tracking.html`)
The main landing page for patients and users.
* **Authentication:** Users sign up/login via an Email OTP verification system.
* **Emergency Ambulance Booking:** Instant dispatch requests capturing patient location, emergency type, and contact details.
* **Doctor Appointments:** Browse available specialists across various departments (Cardiology, Neurology, etc.) and schedule visits.
* **Live Tracking:** Real-time map simulation interface to track the dispatched ambulance en route to the pickup location.

### 2. Hospital Portal (`hospital-dashboard.html`)
Dedicated interface for hospital administrators.
* **Bed Management:** Update total and available beds dynamically.
* **Emergency Monitoring:** Anticipate incoming patients by monitoring active ambulance dispatches.
* **Doctor Roster:** View and manage affiliated doctors and their appointment schedules.

### 3. Driver Dashboard (`driver-dashboard.html`)
A mobile-friendly UI for ambulance drivers on duty.
* **Dispatch Alerts:** Receive instant notifications when a new emergency booking is assigned.
* **Trip Management:** Update trip status (Pending → Dispatched → Completed/Cancelled).
* **Location Sharing:** Streams live GPS coordinates via Socket.io back to the patient and admin dashboards.

### 4. Admin Control Panel (`admin.html`)
The nerve center (TrackNHeal HQ) for system administrators.
* **Centralized View:** Oversee all active ambulance bookings and system-wide metrics.
* **Entity Management:** Manage user accounts, verify hospitals, and add/remove doctors.
* **Broadcast Alerts:** Send system-wide notifications to drivers and hospitals.

---

## 🗄️ Database Schema

The system uses a relational MySQL database (`tracknheal_db.sql`) comprising the following key tables:

* **`users`**: Stores patient details and hashed passwords.
* **`admins`**: Secure credentials for HQ administrators.
* **`bookings`**: Records all ambulance requests, tracking pickup/drop locations, emergency types, and current status (`pending`, `dispatched`, `completed`, `cancelled`).
* **`hospitals`**: Contains registered hospitals, their contact info, and live bed availability (`total_beds`, `available_beds`).
* **`doctors`**: Profiles for medical professionals, including specialization, ratings, available timings, and hospital affiliation.
* **`doctor_appointments`**: Links `users` and `doctors` for scheduled medical consultations.

---

## ⚡ Real-Time Infrastructure

TracknHeal heavily relies on **Socket.io** to provide immediate updates without page refreshes:
* **Ambulance Tracking:** The server acts as a relay between the driver's location emitting events and the user's tracking map.
* **Live Notifications:** Alerts for hospital dashboards when a new patient is en route.
* **Status Updates:** Immediate UI updates when an admin or driver changes a booking status.

---

## 📁 Directory Structure

```text
/College_Proj
├── .env                    # Environment variables (DB credentials, SMTP keys)
├── package.json            # Node.js dependencies
├── server.js               # Main Express.js backend & Socket.io server
├── run_project.bat         # Windows executable script to launch the app
├── db/
│   └── tracknheal_db.sql   # SQL dump for setting up the database
├── public/                 # Frontend assets (served statically)
│   ├── assets/             # Images, logos, and video backgrounds
│   ├── css/                # Stylesheets for each module
│   ├── js/                 # Client-side JavaScript (Socket.io listeners, UI logic)
│   └── html/               # Application Views
│       ├── index.html
│       ├── admin.html
│       ├── ambulance.html
│       ├── tracking.html
│       ├── driver-login.html & driver-dashboard.html
│       └── hospital-login.html & hospital-dashboard.html
```

---

## 🚀 Setup & Installation

Follow these steps to run the TracknHeal platform on your local machine.

### Prerequisites
* **Node.js** (v16.x or higher)
* **MySQL Server** (v8.x recommended)
* A Gmail account with **App Passwords** enabled (for Nodemailer OTP emails).

### 1. Database Configuration
1. Open your MySQL client (e.g., MySQL Workbench).
2. Create a new database: `CREATE DATABASE tracknheal;`
3. Execute the provided SQL dump to build the tables:
   ```bash
   mysql -u root -p tracknheal < db/tracknheal_db.sql
   ```

### 2. Environment Setup
Create a `.env` file in the root directory and populate it with your credentials:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=tracknheal

EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
```

### 3. Install Dependencies
Open your terminal in the project directory and run:
```bash
npm install
```

### 4. Start the Application
**On Windows:**
Simply double-click the `run_project.bat` file, or run it in the command line:
```cmd
run_project.bat
```

**Manual Start:**
```bash
npm start
```

### 5. Access the Platform
Once the server is running, open your web browser and navigate to:
* **Main Portal:** `http://localhost:3000`
* **Admin Dashboard:** `http://localhost:3000/admin.html`
