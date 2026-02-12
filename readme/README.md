## 📘 Project Overview

A web-based application that provides a structured interface for workflows. The project uses HTML, CSS, JavaScript for the frontend and
Node.js for backend processing.


## 🛠️ Tech Stack & Tools

-   **Frontend:** HTML, CSS, JavaScript
-   **Backend:** Node.js (`server.js`)
-   **Package Manager:** npm

## 📁 Project Structure

    .
    ├── node_modules/
    ├── public/
    ├── package.json
    ├── package-lock.json
    ├── server.js

## 📝 Getting Started -- Installation & Setup

1.  Clone repo:

    ``` bash
    git clone https://github.com/rohanchakraborty197/Collage_Proj.git
    cd Collage_Proj
    ```

2.  Install dependencies:

    ``` bash
    npm install
    ```

3.  Start server:

    ``` bash
    node server.js
    ```

4.  Open in browser:

    -   Visit `http://localhost:<port>`

## 👥 Usage

-   Register/login
-   Navigate dashboard
-   Use CRUD features


# Database Setup for the project:

## Prerequisites
- MySQL Server installed and running
- MySQL client or MySQL Workbench

## Steps

1. Connect to MySQL:
```bash
mysql -u root -p
```

2. Create the database:
```sql
CREATE DATABASE IF NOT EXISTS tracknheal_db;
USE tracknheal_db;
```

3. Create the `users` table:
```sql
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

4. Create the `bookings` table:
```sql
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    pickup_location VARCHAR(500) NOT NULL,
    drop_location VARCHAR(500) NOT NULL,
    emergency_type VARCHAR(100) NOT NULL,
    notes TEXT,
    status ENUM('pending', 'dispatched', 'completed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

5. Verify tables were created:
```sql
SHOW TABLES;
DESCRIBE users;
DESCRIBE bookings;
```

## Database Configuration

The database connection is configured in `server.js`:
- **Host:** localhost
- **User:** root
- **Password:** (configured in server.js)
- **Database:** tracknheal_db

> ⚠️ **Note:** Update the password in `server.js` if your MySQL root password is different.


# 🔐 Password Hashing Implementation with Bcrypt

### Step 1: Installed Bcrypt Package
```bash
npm install bcrypt
```
Bcrypt is an industry-standard library for secure password hashing.

---

### Step 2: Imported Bcrypt in server.js
```javascript
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10; // Cost factor for hashing
```
- **Salt Rounds = 10** means the hashing algorithm runs 2^10 = 1024 iterations
- Higher = more secure but slower

---

### Step 3: Updated Signup API
```javascript
// Hash password before storing
const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
db.query(sql, [name, email, hashedPassword], ...)
```

---

### Step 4: Updated Login API
const match = await bcrypt.compare(password, user.password);
if (match) {
    // Login successful
}
```

---

##  Bcrypt Working process

```
User Password: "mypassword123"
                    ↓
            bcrypt.hash()
                    ↓
Stored in DB: "$2b$10$N9qo8uLOickgx2ZMRZoMye.IjqQBrkHx5..."
              └─────┬─────┘
           60-character hash (irreversible)
```

## 🔗 Repository

https://github.com/rohanchakraborty197/Collage_Proj


Make sure the server is running with:
1. npm start(or node server.js)

2. Access the admin page through the server URL: http://localhost:3000/admin.html

Default Admin Credentials:

Email	    : admin@tracknheal.com
Password	: admin123