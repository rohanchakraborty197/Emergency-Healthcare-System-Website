<div align="center">
  <h1>🚑 TracknHeal</h1>
  <p><strong>Emergency Healthcare & Real-Time Ambulance Tracking System</strong></p>
  
  [![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
  [![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
  [![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
  [![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)
</div>

<br />

TracknHeal is a comprehensive, real-time web-based healthcare platform designed to act as a bridge connecting patients, specialized doctors, hospitals, and ambulance drivers. By providing a seamless ecosystem, it ensures immediate response times and highly coordinated care during medical emergencies.

**GitHub Repository:** [TracknHeal on GitHub](https://github.com/rohanchakraborty197/Emergency-Healthcare-System-Website)

---

## ✨ Key Features

TracknHeal is divided into customized portals tailored for different stakeholders:

### 🧑‍⚕️ User & Patient Portal
* **Emergency Ambulance Booking:** Request instant dispatch with exact GPS location capturing and emergency type categorization.
* **Live GPS Tracking:** Real-time map interface allowing patients to track the dispatched ambulance en route via WebSockets.
* **Doctor Appointments:** Browse available specialists across various medical departments and schedule visits.
* **Secure Authentication:** OTP-based Email verification system for secure logins.

### 🏥 Hospital Administration
* **Live Bed Management:** Update and broadcast total and available bed metrics dynamically.
* **Emergency Anticipation:** Monitor active incoming ambulance dispatches to prepare emergency rooms in advance.
* **Staff Roster:** Manage affiliated doctors and their daily appointment schedules.

### 🚑 Driver Dashboard (Mobile-Friendly)
* **Instant Dispatch Alerts:** Receive immediate notifications and routing when a new emergency booking is assigned.
* **Trip Lifecycle:** Update trip status interactively (Pending → Dispatched → Completed/Cancelled).
* **Live Location Streaming:** Continuously stream GPS coordinates back to the patient and hospital.

### 🛡️ Admin Control Panel (TrackNHeal HQ)
* **Centralized Command:** Oversee all active ambulance bookings, user metrics, and system health.
* **Entity Management:** Verify and manage hospitals, doctors, and user accounts.
* **Broadcast Alerts:** Push system-wide emergency notifications to drivers and hospitals.

---

## 🛠️ Technology Stack

* **Frontend:** HTML5, CSS3, Vanilla JavaScript
* **Backend:** Node.js, Express.js
* **Database:** MySQL
* **Real-time Communication:** Socket.io
* **Security & Auth:** bcrypt (Password Hashing), Nodemailer (OTP Emails)

---

## 📁 Directory Structure

```text
/Emergency-Healthcare-System-Website
├── .env                    # Environment configuration (DB, SMTP keys) - NOT COMMITTED
├── package.json            # Node.js dependencies
├── server.js               # Main Express.js application & Socket.io server
├── run_project.bat         # Windows quick-launch executable
├── db/
│   └── tracknheal_db.sql   # MySQL initialization script
└── public/                 # Static frontend assets
    ├── assets/             # Images, logos, and UI assets
    ├── css/                # Module-specific stylesheets
    ├── js/                 # Client-side JavaScript (Socket.io listeners, UI logic)
    └── html/               # Application Views (index, admin, hospital, tracking, etc.)
```

---

## 🚀 Installation & Setup Guide

To run TracknHeal locally on your machine, follow these steps:

### Prerequisites
* **Node.js** (v16.x or higher)
* **MySQL Server** (v8.x recommended)
* A Gmail account with **App Passwords** enabled (required for sending OTPs).

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
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=tracknheal

EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
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

---

<div align="center">
  <p>Built with ❤️ for better Emergency Healthcare</p>
</div>
