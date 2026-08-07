<div align="center">
  <h1>🚑 TracknHeal</h1>
  <p><strong>Emergency Healthcare & Real-Time Ambulance Tracking System</strong></p>
  
  [![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
  [![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
  [![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
  [![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)
  [![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)](https://github.com/features/actions)
</div>

<br />

TracknHeal is a comprehensive, real-time web-based healthcare platform designed to act as a bridge connecting patients, specialized doctors, hospitals, and ambulance drivers. By providing a seamless ecosystem, it ensures immediate response times and highly coordinated care during medical emergencies.


---

## ✨ Key Features

TracknHeal is divided into customized portals tailored for different stakeholders:

### 🧑‍⚕️ User & Patient Portal
* **Emergency Ambulance Booking:** Request instant dispatch with exact GPS location capturing and emergency type categorization.
* **Live GPS Tracking:** Real-time map interface allowing patients to track the dispatched ambulance en route via WebSockets.
* **Doctor Appointments:** Browse available specialists across various medical departments, view available time slots, and schedule visits.
* **Secure Authentication:** OTP-based Email verification system for secure logins and signups.
* **Notification Center:** In-app notifications for booking updates, dispatch alerts, and appointment confirmations with read/unread tracking.
* **Driver Rating System:** Rate ambulance drivers after trip completion to maintain service quality.
* **AI Medical Chatbot:** Get instant symptom analysis, doctor recommendations from the database, and website navigation assistance powered by an LLM.

### 🩺 Doctor Portal
* **Doctor Registration & Login:** Independent signup/login with secure bcrypt password hashing.
* **Appointment Dashboard:** View, accept, or decline patient appointments in real-time.
* **Schedule Management:** Set available days, time slots, and manage daily appointment workloads.
* **Patient History:** Access appointment records and patient information for ongoing care.

### 🏥 Hospital Administration
* **Live Bed Management:** Update and broadcast total and available bed metrics dynamically.
* **Emergency Anticipation:** Monitor active incoming ambulance dispatches to prepare emergency rooms in advance.
* **Staff Roster:** Manage affiliated doctors and their daily appointment schedules.
* **Hospital Profile Management:** Update address, contact details, and bed availability in real-time.
* **Appointment Oversight:** Monitor and manage all appointments booked at the hospital.

### 🚑 Driver Dashboard (Mobile-Friendly)
* **Instant Dispatch Alerts:** Receive immediate notifications and routing when a new emergency booking is assigned.
* **Trip Lifecycle:** Update trip status interactively (Pending → Dispatched → En Route → Completed/Cancelled).
* **Live Location Streaming:** Continuously stream GPS coordinates back to the patient and hospital.
* **Ride History & Stats:** View completed trip history and performance statistics.
* **Status Toggle:** Toggle availability status (Online/Offline) to control dispatch eligibility.

### 🛡️ Admin Control Panel (TrackNHeal HQ)
* **Centralized Command:** Oversee all active ambulance bookings, user metrics, and system health.
* **Entity Management:** Verify and manage hospitals, doctors, drivers, and user accounts.
* **Fleet Management:** View all drivers and their assigned ambulances, and monitor live ambulance positions on a map.
* **Appointment Analytics:** Track appointment statistics, manage appointment statuses across the platform.
* **Broadcast Alerts:** Push system-wide emergency notifications to drivers and hospitals.

### 🤖 AI Medical Chatbot
* **Symptom Analysis:** Describe symptoms and receive potential condition insights.
* **Doctor Recommendations:** Automatically suggests matching specialists from the TracknHeal database based on symptoms.
* **Website Navigation Help:** Guides users to the correct portal or feature (ambulance booking, appointments, hospital portal).
* **Configurable LLM Backend:** Supports LM Studio (local dev), NVIDIA API, or Ollama (production VPS) via environment variables.

---

## 🛠️ Technology Stack

* **Frontend:** HTML, CSS, JavaScript, Leaflet.js, OpenStreetMap
* **Backend:** Node.js (ES Modules), Express.js
* **Database:** MySQL (Connection Pool with auto-reconnection)
* **Real-time Communication:** Socket.io (WebSockets)
* **Routing & Geocoding:** OSRM (Open Source Routing Machine), Nominatim
* **AI / Chatbot:** LLM integration (LM Studio / NVIDIA NIM API / Ollama)
* **Security & Auth:** bcrypt (Password Hashing), Nodemailer (OTP Emails)
* **CI/CD:** GitHub Actions (Auto-deploy to Azure VM via SSH)
* **Production:** Nginx (Reverse Proxy), PM2 (Process Manager)

---

## 📁 Directory Structure

```text
/Emergency-Healthcare-System-Website
├── .env                    # Environment configuration (DB, SMTP, LLM keys) - NOT COMMITTED
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Actions CI/CD pipeline (Azure VM auto-deploy)
├── .gitignore              # Git ignore rules
├── package.json            # Node.js dependencies & scripts (ES Modules)
├── server.js               # Main Express.js application & Socket.io server (~2500 lines)
├── run_project.bat         # Windows quick-launch executable
├── db/
│   └── tracknheal_db.sql   # MySQL initialization script
└── public/                 # Static frontend assets
    ├── assets/             # Images, logos, and UI assets
    ├── css/                # Module-specific stylesheets
    │   ├── index.css
    │   ├── admin.css
    │   ├── ambulance.css
    │   ├── tracking.css
    │   ├── driver-login.css
    │   ├── driver-dashboard.css
    │   └── hospital-login.css
    ├── js/                 # Client-side JavaScript (Socket.io listeners, UI logic)
    │   ├── index.js
    │   ├── admin.js
    │   ├── ambulance.js
    │   ├── tracking.js
    │   ├── driver-login.js
    │   ├── driver-dashboard.js
    │   ├── hospital-login.js
    │   └── hospital-dashboard.js
    └── html/               # Application views
        ├── index.html            # Main user portal (home, appointments, chatbot)
        ├── admin.html            # Admin control panel
        ├── ambulance.html        # Ambulance booking page
        ├── tracking.html         # Live ambulance tracking map
        ├── driver-login.html     # Driver authentication
        ├── driver-dashboard.html # Driver trip management
        ├── doctor-login.html     # Doctor authentication
        ├── doctor-dashboard.html # Doctor appointment management
        ├── hospital-login.html   # Hospital authentication
        └── hospital-dashboard.html # Hospital administration
```

---

## 🚀 Installation & Setup Guide

To run TracknHeal locally on your machine, follow these steps:

### Prerequisites
* **Node.js** (v16.x or higher)
* **MySQL Server** (v8.x recommended)
* A Gmail account with **App Passwords** enabled (required for sending OTPs).
* *(Optional)* An LLM server for the AI chatbot — [LM Studio](https://lmstudio.ai/) (local) or an [NVIDIA NIM](https://build.nvidia.com/) API key.

### 1. Database Initialization
1. Open your MySQL client (e.g., MySQL Workbench or CLI).
2. Create the database: 
   ```sql
   CREATE DATABASE tracknheal;
   ```
3. Import the provided SQL dump to build the tables:
   ```bash
   mysql -u root -p tracknheal < db/tracknheal_db.sql
   ```

### 2. Environment Variables
Create a file named `.env` in the root directory and add your credentials:
```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=tracknheal

# Server
PORT=3000
NODE_ENV=development

# Email (OTP Verification)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password

# AI Chatbot (Optional - chatbot won't work without this)
LLM_URL=http://127.0.0.1:1234/v1/chat/completions   # LM Studio default
LLM_MODEL=local-model                                 # or e.g. meta/llama-3.1-8b-instruct
LLM_API_KEY=                                           # Required for cloud LLM providers

# CORS (Optional - defaults to "*" in development)
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### 3. Install Dependencies
Open a terminal in the project root and install the required Node packages:
```bash
npm install
```

### 4. Launch the Application
**On Windows:**
Simply double-click the `run_project.bat` script, or execute it in your terminal:
```cmd
run_project.bat
```

**Manual Start (Mac/Linux/Windows):**
```bash
npm start
```

### 5. Access the Platform
Once the server initializes, open your web browser and navigate to:
* **Main User Portal:** `http://localhost:3000`
* **Admin Dashboard:** `http://localhost:3000/admin.html`
* **Ambulance Booking:** `http://localhost:3000/ambulance.html`
* **Live Tracking:** `http://localhost:3000/tracking.html`
* **Doctor Login:** `http://localhost:3000/doctor-login.html`
* **Driver Login:** `http://localhost:3000/driver-login.html`
* **Hospital Login:** `http://localhost:3000/hospital-login.html`

---

## 🔄 CI/CD Deployment

The project includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically deploys to an Azure VM on every push to the configured branch:

1. Connects to the VM via SSH
2. Pulls latest code from the branch
3. Installs production dependencies
4. Restarts the application via PM2

**Required GitHub Secrets:**
| Secret | Description |
|---|---|
| `VM_HOST` | Azure VM IP address or hostname |
| `VM_USERNAME` | SSH username for the VM |
| `VM_SSH_KEY` | Private SSH key for authentication |

---

## 📡 API Overview

<details>
<summary><strong>Authentication & Users</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/signup` | User registration with OTP verification |
| POST | `/login` | User login with bcrypt password check |
| POST | `/verify-otp` | Verify email OTP |
| POST | `/resend-otp` | Resend OTP to email |

</details>

<details>
<summary><strong>Ambulance Bookings</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/book` | Create a new ambulance booking |
| GET | `/bookings/:id` | Get booking details by ID |
| GET | `/user/bookings/:userId` | Get all bookings for a user |
| PUT | `/user/bookings/:bookingId/cancel` | Cancel a booking |
| POST | `/user/bookings/:bookingId/rate` | Rate a completed trip |

</details>

<details>
<summary><strong>Doctor Portal</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/doctor/signup` | Doctor registration |
| POST | `/doctor/login` | Doctor login |
| GET | `/doctor/appointments/:doctorName` | Get doctor's appointments |
| PUT | `/doctor/appointments/:id/status` | Update appointment status |
| GET | `/doctor/:doctorId/booked-slots` | Get booked time slots |
| GET | `/doctors` | List all doctors |
| GET | `/doctors/specialization/:spec` | Filter doctors by specialization |

</details>

<details>
<summary><strong>Hospital Portal</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/hospital/signup` | Hospital registration |
| POST | `/hospital/login` | Hospital login |
| POST | `/hospital/doctors` | Add a doctor to hospital |
| GET | `/hospital/doctors/:hospitalName` | List hospital's doctors |
| GET | `/hospital/appointments/:hospitalName` | List hospital's appointments |
| GET | `/hospital/profile/:hospitalName` | Get hospital profile |
| PUT | `/hospital/profile/:hospitalName` | Update hospital profile |

</details>

<details>
<summary><strong>Driver Portal</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/driver/signup` | Driver registration |
| POST | `/driver/login` | Driver login |
| GET | `/driver/rides/:driverId` | Get active rides |
| GET | `/driver/history/:driverId` | Get ride history |
| PUT | `/driver/rides/:bookingId/accept` | Accept a ride |
| PUT | `/driver/rides/:bookingId/complete` | Complete a ride |
| GET | `/driver/stats/:driverId` | Get driver statistics |
| PUT | `/driver/status/:driverId` | Toggle online/offline |

</details>

<details>
<summary><strong>Admin Panel</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/login` | Admin login |
| GET | `/admin/stats` | Platform-wide statistics |
| GET | `/admin/bookings` | All bookings |
| GET | `/admin/users` | All registered users |
| GET | `/admin/doctors` | All doctors |
| GET | `/admin/drivers` | All drivers |
| GET | `/admin/hospitals` | All hospitals |
| GET | `/admin/fleet/drivers` | Fleet driver + ambulance data |
| GET | `/admin/fleet/live` | Live tracking data |
| GET | `/admin/appointments` | All appointments |
| GET | `/admin/appointment-stats` | Appointment analytics |

</details>

<details>
<summary><strong>Tracking & Notifications</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/tracking/start/:bookingId` | Start ambulance tracking |
| GET | `/tracking/:bookingId` | Get tracking status |
| GET | `/user/notifications/:userId` | Get user notifications |
| POST | `/user/notifications/:notificationId/read` | Mark notification as read |
| POST | `/user/notifications/read-all/:userId` | Mark all as read |
| POST | `/api/chat` | AI chatbot endpoint |

</details>

---
