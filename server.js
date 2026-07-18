import "dotenv/config";
import express from "express";
import mysql from "mysql2";
import cors from "cors";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";
import { Server as SocketIOServer } from "socket.io";

import nodemailer from "nodemailer";

const SALT_ROUNDS = 10; // Cost factor for bcrypt hashing

// Default dispatch origin for ambulance (TrackNHeal HQ - Kolkata)
const DISPATCH_ORIGIN = { lat: 22.5726, lng: 88.3639 };

// ✅ OTP INFRASTRUCTURE
// In-memory OTP store: email → { otp, expiresAt, context, userData }
const otpStore = new Map();
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// Gmail SMTP transporter for sending OTP emails
const emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Verify email transporter on startup
emailTransporter.verify((err) => {
    if (err) {
        console.error("⚠️ Email transporter error (OTP emails won't work):", err.message);
    } else {
        console.log("✅ Email transporter ready for OTP emails");
    }
});

// Generate a random 6-digit OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP email with styled HTML template
async function sendOTPEmail(email, otp, userName) {
    const mailOptions = {
        from: `"TracknHeal" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `🔐 Your TracknHeal Verification Code: ${otp}`,
        html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                <div style="background: linear-gradient(135deg, #e74c3c, #c0392b); padding: 32px 24px; text-align: center;">
                    <h1 style="color: #fff; margin: 0; font-size: 24px; letter-spacing: 0.5px;">🚑 TracknHeal</h1>
                    <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Email Verification</p>
                </div>
                <div style="padding: 32px 24px; text-align: center;">
                    <p style="color: #333; font-size: 16px; margin: 0 0 8px;">Hello${userName ? ', <strong>' + userName + '</strong>' : ''}!</p>
                    <p style="color: #666; font-size: 14px; margin: 0 0 24px;">Use the code below to verify your identity:</p>
                    <div style="background: #f8f9fa; border: 2px dashed #e74c3c; border-radius: 12px; padding: 20px; margin: 0 auto 24px; display: inline-block;">
                        <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #e74c3c; font-family: 'Courier New', monospace;">${otp}</span>
                    </div>
                    <p style="color: #999; font-size: 13px; margin: 0;">This code expires in <strong>5 minutes</strong>.</p>
                    <p style="color: #999; font-size: 13px; margin: 4px 0 0;">If you didn't request this, please ignore this email.</p>
                </div>
                <div style="background: #f8f9fa; padding: 16px 24px; text-align: center; border-top: 1px solid #eee;">
                    <p style="color: #aaa; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} TracknHeal Ambulance Service</p>
                </div>
            </div>
        `
    };
    try {
        await emailTransporter.sendMail(mailOptions);
        
        // Log to notifications table (using existing schema)
        const logQuery = `INSERT INTO notifications (user_id, booking_id, type, title, message, is_read) VALUES (?, ?, ?, ?, ?, ?)`;
        const logValues = [null, null, 'EMAIL', 'OTP Verification', `Sent OTP verification email to ${email} (status: sent)`, 0];
        db.query(logQuery, logValues, (err) => {
            if (err) console.error("Error logging notification:", err.message);
        });
    } catch (error) {
        // Log failure to notifications table
        const logQuery = `INSERT INTO notifications (user_id, booking_id, type, title, message, is_read) VALUES (?, ?, ?, ?, ?, ?)`;
        const logValues = [null, null, 'EMAIL', 'OTP Verification', `Failed to send OTP verification email to ${email} (status: failed)`, 0];
        db.query(logQuery, logValues, () => {});
        throw error;
    }
}

// Store OTP for an email
function storeOTP(email, otp, context, userData = null) {
    otpStore.set(email.toLowerCase(), {
        otp,
        expiresAt: Date.now() + OTP_EXPIRY_MS,
        context, // 'login' or 'signup'
        userData // For signup: { name, email, hashedPassword }
    });
}

// Verify OTP for an email
function verifyOTP(email, otp) {
    const entry = otpStore.get(email.toLowerCase());
    if (!entry) return { valid: false, reason: 'No OTP found. Please request a new one.' };
    if (Date.now() > entry.expiresAt) {
        otpStore.delete(email.toLowerCase());
        return { valid: false, reason: 'OTP has expired. Please request a new one.' };
    }
    if (entry.otp !== otp) return { valid: false, reason: 'Invalid OTP. Please try again.' };
    return { valid: true, context: entry.context, userData: entry.userData };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: "*" } });

// Store active tracking simulations
const activeSimulations = new Map();

app.use(cors());
app.use(express.json());

// ✅ Serve static files from public folder
app.use(express.static(path.join(__dirname, "public")));

// ✅ Serve HTML files from public/html folder
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "html", "index.html"));
});
app.get("/admin.html", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "html", "admin.html"));
});
app.get("/tracking.html", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "html", "tracking.html"));
});
app.get("/ambulance.html", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "html", "ambulance.html"));
});
app.get("/driver-login.html", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "html", "driver-login.html"));
});
app.get("/driver-dashboard.html", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "html", "driver-dashboard.html"));
});
app.get("/hospital-login.html", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "html", "hospital-login.html"));
});
app.get("/hospital-dashboard.html", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "html", "hospital-dashboard.html"));
});

// ✅ MySQL Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect(err => {
    if (err) throw err;
    console.log("✅ MySQL Connected");

    // Auto-create hospitals table
    const createHospitalsTable = `
        CREATE TABLE IF NOT EXISTS hospitals (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            email VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            address TEXT,
            phone VARCHAR(20),
            total_beds INT DEFAULT 0,
            available_beds INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    db.query(createHospitalsTable, (err) => {
        if (err) console.error("Error creating hospitals table:", err.message);
        else {
            console.log("✅ hospitals table ready");
            // Run migrations to add beds columns if they don't exist
            db.query("ALTER TABLE hospitals ADD COLUMN total_beds INT DEFAULT 0", () => {});
            db.query("ALTER TABLE hospitals ADD COLUMN available_beds INT DEFAULT 0", () => {});
        }
    });


    // Auto-create doctor_appointments table
    const createApptTable = `
        CREATE TABLE IF NOT EXISTS doctor_appointments(
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    doctor_id INT DEFAULT NULL,
    doctor_name VARCHAR(255) NOT NULL,
    specialization VARCHAR(255),
    doctor_degree VARCHAR(100),
    patient_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    appointment_date DATE NOT NULL,
    appointment_time VARCHAR(20) NOT NULL,
    reason TEXT,
    status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY(doctor_id) REFERENCES doctors(id) ON DELETE SET NULL
)
    `;
    db.query(createApptTable, (err) => {
        if (err) console.error("Error creating doctor_appointments table:", err.message);
        else console.log("✅ doctor_appointments table ready");
    });

    // Auto-add password column to doctors table if missing
    const addDoctorPassword = `
        ALTER TABLE doctors ADD COLUMN password VARCHAR(255) DEFAULT NULL
    `;
    db.query(addDoctorPassword, (err) => {
        if (err && !err.message.includes('Duplicate column')) {
            console.error("Doctor password column:", err.message);
        } else {
            console.log("✅ doctors.password column ready");
        }
    });

    // Auto-add doctor_degree column to doctor_appointments table if missing
    const addDoctorDegree = `
        ALTER TABLE doctor_appointments ADD COLUMN doctor_degree VARCHAR(100) DEFAULT NULL
    `;
    db.query(addDoctorDegree, (err) => {
        if (err && !err.message.includes('Duplicate column')) {
            console.error("Doctor degree column:", err.message);
        } else {
            console.log("✅ doctor_appointments.doctor_degree column ready");
        }
    });

    // Auto-add doctor_id column to doctor_appointments table if missing
    const addDoctorId = `
        ALTER TABLE doctor_appointments ADD COLUMN doctor_id INT DEFAULT NULL
    `;
    db.query(addDoctorId, (err) => {
        if (err && !err.message.includes('Duplicate column')) {
            console.error("Doctor ID column:", err.message);
        } else {
            console.log("✅ doctor_appointments.doctor_id column ready");
            // Add foreign key if it doesn't exist (ignoring errors if it already exists or if data violates it initially)
            db.query("ALTER TABLE doctor_appointments ADD CONSTRAINT fk_doc_id FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL", () => {});
        }
    });

    // Auto-create ambulance_tracking table
    const createTrackingTable = `
        CREATE TABLE IF NOT EXISTS ambulance_tracking (
            id INT AUTO_INCREMENT PRIMARY KEY,
            booking_id INT NOT NULL,
            ambulance_lat DOUBLE NOT NULL,
            ambulance_lng DOUBLE NOT NULL,
            pickup_lat DOUBLE NOT NULL,
            pickup_lng DOUBLE NOT NULL,
            drop_lat DOUBLE DEFAULT NULL,
            drop_lng DOUBLE DEFAULT NULL,
            route_coords JSON,
            drop_route_coords JSON,
            current_step INT DEFAULT 0,
            total_steps INT DEFAULT 0,
            phase ENUM('to_pickup', 'to_hospital') DEFAULT 'to_pickup',
            status ENUM('dispatched', 'en_route', 'arrived', 'dropping', 'completed') DEFAULT 'dispatched',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
        )
    `;
    db.query(createTrackingTable, (err) => {
        if (err) console.error("Error creating ambulance_tracking table:", err.message);
        else console.log("✅ ambulance_tracking table ready");
    });

    // Auto-add drop columns if missing (for existing tables)
    const addDropCols = [
        "ALTER TABLE ambulance_tracking ADD COLUMN drop_lat DOUBLE DEFAULT NULL",
        "ALTER TABLE ambulance_tracking ADD COLUMN drop_lng DOUBLE DEFAULT NULL",
        "ALTER TABLE ambulance_tracking ADD COLUMN drop_route_coords JSON",
        "ALTER TABLE ambulance_tracking ADD COLUMN phase ENUM('to_pickup','to_hospital') DEFAULT 'to_pickup'"
    ];
    addDropCols.forEach(sql => {
        db.query(sql, (err) => {
            if (err && !err.message.includes('Duplicate column')) {
                console.error('Tracking column migration:', err.message);
            }
        });
    });
    // Update status enum to include new values
    db.query("ALTER TABLE ambulance_tracking MODIFY COLUMN status ENUM('dispatched','en_route','arrived','dropping','completed') DEFAULT 'dispatched'", (err) => {
        if (err && !err.message.includes('Duplicate')) console.error('Status enum update:', err.message);
    });

    // Auto-create ambulances fleet table
    const createAmbulancesTable = `
        CREATE TABLE IF NOT EXISTS ambulances (
            id INT AUTO_INCREMENT PRIMARY KEY,
            vehicle_id VARCHAR(20) NOT NULL UNIQUE,
            plate_number VARCHAR(30) NOT NULL,
            ambulance_type ENUM('ALS', 'BLS', 'PALS', 'MICU') DEFAULT 'BLS',
            equipment VARCHAR(100) DEFAULT 'Basic Life Support',
            driver_name VARCHAR(255) DEFAULT NULL,
            driver_phone VARCHAR(20) DEFAULT NULL,
            status ENUM('available', 'on-duty', 'maintenance', 'retired') DEFAULT 'available',
            area VARCHAR(255) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `;
    db.query(createAmbulancesTable, (err) => {
        if (err) console.error("Error creating ambulances table:", err.message);
        else console.log("✅ ambulances table ready");
    });

    // Auto-create notifications table
    const createNotificationsTable = `
        CREATE TABLE IF NOT EXISTS notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            booking_id INT DEFAULT NULL,
            type VARCHAR(50) NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT,
            is_read TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `;
    db.query(createNotificationsTable, (err) => {
        if (err) console.error("Error creating notifications table:", err.message);
        else {
            console.log("✅ notifications table ready");
            // Add doctor_id to notifications
            db.query("ALTER TABLE notifications ADD COLUMN doctor_id INT DEFAULT NULL", (e) => {
                if(e && !e.message.includes('Duplicate column')) console.error("Error adding doctor_id to notifications:", e.message);
            });
        }
    });

    // Set default passwords for doctors if they don't have one
    bcrypt.hash('password123', SALT_ROUNDS, (err, hash) => {
        if (!err) {
            db.query("UPDATE doctors SET password = ? WHERE password IS NULL", [hash], (e, r) => {
                if(!e && r.affectedRows > 0) console.log("✅ Set default passwords for existing doctors");
            });
        }
    });

    // Auto-create ambulance_drivers table
    const createDriversTable = `
        CREATE TABLE IF NOT EXISTS ambulance_drivers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            phone VARCHAR(20) DEFAULT NULL,
            license_number VARCHAR(50) DEFAULT NULL,
            status ENUM('available', 'on_duty', 'offline') DEFAULT 'available',
            assigned_ambulance_id INT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `;
    db.query(createDriversTable, (err) => {
        if (err) console.error("Error creating ambulance_drivers table:", err.message);
        else console.log("✅ ambulance_drivers table ready");
    });

    // Add assignment columns to bookings if missing
    const addBookingCols = [
        "ALTER TABLE bookings ADD COLUMN assigned_ambulance_id INT DEFAULT NULL",
        "ALTER TABLE bookings ADD COLUMN assigned_driver_id INT DEFAULT NULL",
        "ALTER TABLE bookings ADD COLUMN fare DECIMAL(10,2) DEFAULT 0.00",
        "ALTER TABLE bookings ADD COLUMN driver_rating INT DEFAULT NULL"
    ];
    addBookingCols.forEach(sql => {
        db.query(sql, (err) => {
            if (err && !err.message.includes('Duplicate column')) {
                console.error('Booking column migration:', err.message);
            }
        });
    });

    // Add analytical columns to ambulance_drivers if missing
    const addDriverCols = [
        "ALTER TABLE ambulance_drivers ADD COLUMN rating FLOAT DEFAULT 5.0",
        "ALTER TABLE ambulance_drivers ADD COLUMN total_ratings INT DEFAULT 0",
        "ALTER TABLE ambulance_drivers ADD COLUMN total_trips INT DEFAULT 0",
        "ALTER TABLE ambulance_drivers ADD COLUMN total_earnings DECIMAL(10,2) DEFAULT 0.00"
    ];
    addDriverCols.forEach(sql => {
        db.query(sql, (err) => {
            if (err && !err.message.includes('Duplicate column')) {
                console.error('Driver column migration:', err.message);
            }
        });
    });
});

// ✅ SIGNUP API (with OTP verification)
app.post("/signup", async (req, res) => {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
        return res.json({ message: "All fields are required" });
    }

    try {
        // Check if email already exists in DB
        const checkSql = "SELECT id FROM users WHERE email = ?";
        db.query(checkSql, [email], async (err, results) => {
            if (err) {
                console.error("Signup check error:", err);
                return res.json({ message: "Signup failed" });
            }
            if (results.length > 0) {
                return res.json({ message: "Email already exists" });
            }

            // Hash password with bcrypt
            const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

            // Generate OTP and store signup data temporarily
            const otp = generateOTP();
            storeOTP(email, otp, 'signup', { name, email, hashedPassword });

            // Send OTP email
            try {
                await sendOTPEmail(email, otp, name);
                console.log(`📧 Signup OTP sent to ${email}`);
                res.json({ otpRequired: true, message: "OTP sent to your email" });
            } catch (emailErr) {
                console.error("OTP email error:", emailErr);
                otpStore.delete(email.toLowerCase());
                res.json({ message: "Failed to send OTP email. Please try again." });
            }
        });
    } catch (error) {
        console.error("Signup error:", error);
        res.json({ message: "Signup failed" });
    }
});

// ✅ LOGIN API (direct login — no OTP required)
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.json({ success: false, message: "Email and password are required" });
    }
    const sql = "SELECT * FROM users WHERE email=?";
    db.query(sql, [email], async (err, results) => {
        if (err) {
            console.error("Login error:", err);
            return res.json({ success: false, message: "Login failed" });
        }

        if (results.length > 0) {
            const user = results[0];

            try {
                // Check if password is bcrypt hashed (starts with $2b$ or $2a$)
                const isHashed = user.password.startsWith('$2b$') || user.password.startsWith('$2a$');

                let match = false;
                if (isHashed) {
                    match = await bcrypt.compare(password, user.password);
                } else {
                    match = (password === user.password);
                }

                if (match) {
                    // Password correct — login directly (no OTP)
                    console.log(`✅ User ${user.name} logged in successfully`);
                    res.json({
                        success: true,
                        message: "Login successful",
                        userId: user.id,
                        userName: user.name
                    });
                } else {
                    res.json({ success: false, message: "Invalid email or password" });
                }
            } catch (error) {
                console.error("Compare error:", error);
                res.json({ success: false, message: "Login failed" });
            }
        } else {
            res.json({ success: false, message: "Invalid email or password" });
        }
    });
});

// ✅ VERIFY OTP API
app.post("/verify-otp", (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.json({ success: false, message: "Email and OTP are required" });
    }

    const result = verifyOTP(email, otp);

    if (!result.valid) {
        return res.json({ success: false, message: result.reason });
    }

    // OTP verified — clean up
    otpStore.delete(email.toLowerCase());

    if (result.context === 'signup') {
        // Insert the user into DB now
        const { name, hashedPassword } = result.userData;
        const sql = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";
        db.query(sql, [name, email, hashedPassword], (err, dbResult) => {
            if (err) {
                if (err.code === "ER_DUP_ENTRY") {
                    return res.json({ success: false, message: "Email already exists" });
                }
                console.error("Signup insert error:", err);
                return res.json({ success: false, message: "Signup failed" });
            }
            res.json({
                success: true,
                message: "Signup successful",
                context: 'signup',
                userId: dbResult.insertId,
                userName: name
            });
        });
    } else if (result.context === 'login') {
        // Return user session data
        const { userId, userName } = result.userData;
        res.json({
            success: true,
            message: "Login successful",
            context: 'login',
            userId,
            userName
        });
    }
});

// ✅ RESEND OTP API
app.post("/resend-otp", async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.json({ success: false, message: "Email is required" });
    }

    const existing = otpStore.get(email.toLowerCase());
    if (!existing) {
        return res.json({ success: false, message: "No pending verification. Please start over." });
    }

    // Generate a new OTP, keep same context and userData
    const newOtp = generateOTP();
    storeOTP(email, newOtp, existing.context, existing.userData);

    try {
        const userName = existing.userData?.name || existing.userData?.userName || '';
        await sendOTPEmail(email, newOtp, userName);
        console.log(`📧 Resent OTP to ${email}`);
        res.json({ success: true, message: "New OTP sent to your email" });
    } catch (emailErr) {
        console.error("Resend OTP error:", emailErr);
        res.json({ success: false, message: "Failed to send OTP. Please try again." });
    }
});



// ✅ BOOK AMBULANCE API (creates pending booking, waits for driver acceptance)
app.post("/book", async (req, res) => {
    const { userId, patientName, phone, pickupLocation, dropLocation, emergencyType, notes } = req.body;

    if (!patientName || !phone || !pickupLocation || !dropLocation || !emergencyType) {
        return res.json({ success: false, message: "All required fields must be filled" });
    }

    const sql = `INSERT INTO bookings(user_id, patient_name, phone, pickup_location, drop_location, emergency_type, notes, status)
                 VALUES(?, ?, ?, ?, ?, ?, ?, 'pending')`;

    db.query(sql, [userId || null, patientName, phone, pickupLocation, dropLocation, emergencyType, notes || ""], (err, result) => {
        if (err) {
            console.error("Booking error:", err);
            return res.json({ success: false, message: "Booking failed. Please try again." });
        }

        const newBookingId = result.insertId;

        // Create booking notification
        createNotification(userId, newBookingId, 'booking_confirmed', 'Booking Confirmed',
            `Your ambulance booking #${newBookingId} is confirmed! Waiting for an available driver to accept your ride.`);

        res.json({
            success: true,
            message: "Booking confirmed! Waiting for a driver to accept your ride.",
            bookingId: newBookingId,
            ambulance: null
        });
    });
});




// ✅ GET SINGLE BOOKING DETAILS (for tracking)
app.get("/bookings/:id", (req, res) => {
    const { id } = req.params;
    const sql = "SELECT * FROM bookings WHERE id = ?";
    db.query(sql, [id], (err, results) => {
        if (err) {
            console.error("Fetch booking error:", err);
            return res.json({ success: false, message: "Failed to fetch booking" });
        }
        if (results.length === 0) {
            return res.json({ success: false, message: "Booking not found" });
        }
        res.json({ success: true, booking: results[0] });
    });
});

// ✅ GET USER'S BOOKING HISTORY
app.get("/user/bookings/:userId", (req, res) => {
    const { userId } = req.params;

    const sql = "SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC";
    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error("Fetch user bookings error:", err);
            return res.json({ success: false, message: "Failed to fetch bookings" });
        }
        res.json({ success: true, bookings: results });
    });
});

// ✅ USER CANCEL BOOKING
app.put("/user/bookings/:bookingId/cancel", (req, res) => {
    const { bookingId } = req.params;
    const { userId } = req.body;

    // First check if booking belongs to user and is cancellable
    const checkSql = "SELECT * FROM bookings WHERE id = ? AND user_id = ?";
    db.query(checkSql, [bookingId, userId], (err, results) => {
        if (err) {
            console.error("Check booking error:", err);
            return res.json({ success: false, message: "Failed to cancel booking" });
        }

        if (results.length === 0) {
            return res.json({ success: false, message: "Booking not found" });
        }

        const booking = results[0];
        if (booking.status === 'completed' || booking.status === 'cancelled') {
            return res.json({ success: false, message: "Cannot cancel this booking" });
        }

        // Cancel the booking
        const updateSql = "UPDATE bookings SET status = 'cancelled' WHERE id = ?";
        db.query(updateSql, [bookingId], (err) => {
            if (err) {
                console.error("Cancel booking error:", err);
                return res.json({ success: false, message: "Failed to cancel booking" });
            }

            // Stop tracking simulation & notify clients
            stopTracking(bookingId);

            // Create cancellation notification
            createNotification(booking.user_id, bookingId, 'booking_cancelled', 'Booking Cancelled',
                `Your ambulance booking #${bookingId} has been cancelled.`);

            // Release assigned ambulance
            if (booking.assigned_ambulance_id) {
                db.query("UPDATE ambulances SET status = 'available' WHERE id = ?", [booking.assigned_ambulance_id]);
            }

            res.json({ success: true, message: "Booking cancelled successfully" });
        });
    });
});

// ✅ HOSPITAL APIs:

// ✅ HOSPITAL SIGNUP API
app.post("/hospital/signup", async (req, res) => {
    const { name, email, password, address, phone } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ success: false, message: "Name, email, and password are required" });
    }

    try {
        db.query("SELECT id FROM hospitals WHERE email = ? OR name = ?", [email, name], async (err, results) => {
            if (err) {
                console.error("Hospital signup check error:", err);
                return res.status(500).json({ success: false, message: "Database error" });
            }

            if (results.length > 0) {
                return res.status(400).json({ success: false, message: "Email or Hospital Name already registered" });
            }

            const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

            const sql = `INSERT INTO hospitals (name, email, password, address, phone) VALUES (?, ?, ?, ?, ?)`;
            const values = [name, email, hashedPassword, address || '', phone || ''];

            db.query(sql, values, (err, result) => {
                if (err) {
                    console.error("Hospital insert error:", err);
                    return res.status(500).json({ success: false, message: "Failed to create hospital account" });
                }
                res.json({
                    success: true,
                    message: "Hospital registered successfully",
                    hospitalId: result.insertId,
                    hospitalName: name
                });
            });
        });
    } catch (error) {
        console.error("Hospital signup error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// ✅ HOSPITAL LOGIN API
app.post("/hospital/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.json({ success: false, message: "Email and password are required" });
    }

    const sql = "SELECT * FROM hospitals WHERE email=?";
    db.query(sql, [email], async (err, results) => {
        if (err) {
            console.error("Hospital login error:", err);
            return res.json({ success: false, message: "Login failed" });
        }

        if (results.length > 0) {
            const hospital = results[0];

            try {
                const match = await bcrypt.compare(password, hospital.password);

                if (match) {
                    res.json({
                        success: true,
                        message: "Hospital login successful",
                        hospitalId: hospital.id,
                        hospitalName: hospital.name
                    });
                } else {
                    res.json({ success: false, message: "Invalid credentials" });
                }
            } catch (error) {
                console.error("Hospital compare error:", error);
                res.json({ success: false, message: "Login failed" });
            }
        } else {
            res.json({ success: false, message: "Invalid credentials" });
        }
    });
});

// ✅ HOSPITAL: ADD DOCTOR
app.post("/hospital/doctors", (req, res) => {
    const { name, specialization, degree, hospital, phone, email, available_days, available_time } = req.body;

    if (!name || !specialization || !hospital) {
        return res.json({ success: false, message: "Name, specialization, and hospital are required" });
    }

    const sql = `
        INSERT INTO doctors 
        (name, specialization, degree, hospital, phone, email, available_days, available_time) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [name, specialization, degree || null, hospital, phone || null, email || null, available_days || 'Mon-Fri', available_time || '9:00 AM - 5:00 PM'];

    db.query(sql, values, (err) => {
        if (err) {
            console.error("Add doctor error:", err);
            return res.json({ success: false, message: "Failed to add doctor" });
        }
        res.json({ success: true, message: "Doctor added successfully" });
    });
});

// ✅ HOSPITAL: UPDATE DOCTOR
app.put("/hospital/doctors/:id", (req, res) => {
    const { id } = req.params;
    const { name, specialization, degree, phone, email, available_days, available_time, hospitalName } = req.body;

    // Verify the doctor actually belongs to this hospital
    db.query("SELECT * FROM doctors WHERE id = ? AND hospital = ?", [id, hospitalName], (checkErr, checkResults) => {
        if (checkErr || checkResults.length === 0) {
            return res.json({ success: false, message: "Unauthorized or doctor not found" });
        }

        const sql = `
            UPDATE doctors 
            SET name=?, specialization=?, degree=?, phone=?, email=?, available_days=?, available_time=?
            WHERE id=?
        `;
        const values = [name, specialization, degree, phone, email, available_days, available_time, id];

        db.query(sql, values, (err) => {
            if (err) {
                console.error("Update hospital doctor error:", err);
                return res.json({ success: false, message: "Failed to update doctor" });
            }
            res.json({ success: true, message: "Doctor updated successfully" });
        });
    });
});

// ✅ HOSPITAL: DELETE DOCTOR
app.delete("/hospital/doctors/:id", (req, res) => {
    const { id } = req.params;
    const hospitalName = req.body.hospitalName; // Expecting hospitalName in body for verification

    // Verify the doctor actually belongs to this hospital
    db.query("SELECT * FROM doctors WHERE id = ? AND hospital = ?", [id, hospitalName], (checkErr, checkResults) => {
        if (checkErr || checkResults.length === 0) {
            return res.json({ success: false, message: "Unauthorized or doctor not found" });
        }

        const sql = "DELETE FROM doctors WHERE id=?";
        db.query(sql, [id], (err) => {
            if (err) {
                console.error("Delete hospital doctor error:", err);
                return res.json({ success: false, message: "Failed to delete doctor" });
            }
            res.json({ success: true, message: "Doctor deleted successfully" });
        });
    });
});

// ✅ HOSPITAL: GET DOCTORS
app.get("/hospital/doctors/:hospitalName", (req, res) => {
    const { hospitalName } = req.params;
    const sql = "SELECT * FROM doctors WHERE hospital = ? ORDER BY name ASC";
    db.query(sql, [hospitalName], (err, results) => {
        if (err) {
            console.error("Fetch hospital doctors error:", err);
            return res.json({ success: false, message: "Failed to fetch doctors" });
        }
        res.json({ success: true, doctors: results });
    });
});

// ✅ HOSPITAL: GET APPOINTMENTS
app.get("/hospital/appointments/:hospitalName", (req, res) => {
    const { hospitalName } = req.params;
    
    const sql = `
        SELECT da.* 
        FROM doctor_appointments da
        JOIN doctors d ON da.doctor_id = d.id
        WHERE d.hospital = ?
        ORDER BY da.appointment_date DESC, da.appointment_time DESC
    `;
    db.query(sql, [hospitalName], (err, results) => {
        if (err) {
            console.error("Fetch hospital appointments error:", err);
            return res.json({ success: false, message: "Failed to fetch appointments" });
        }
        res.json({ success: true, appointments: results });
    });
});

// ✅ HOSPITAL: UPDATE APPOINTMENT STATUS
app.put("/hospital/appointments/:id/status", (req, res) => {
    const { id } = req.params;
    const { status, hospitalName } = req.body;

    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
        return res.json({ success: false, message: "Invalid status" });
    }

    // Verify the appointment belongs to a doctor at this hospital
    const verifySql = `
        SELECT da.id, da.user_id, da.doctor_name, da.appointment_date, da.appointment_time
        FROM doctor_appointments da
        JOIN doctors d ON da.doctor_id = d.id
        WHERE da.id = ? AND d.hospital = ?
    `;

    db.query(verifySql, [id, hospitalName], (err, results) => {
        if (err) {
            console.error("Verify hospital appointment error:", err);
            return res.json({ success: false, message: "Failed to update status" });
        }
        if (results.length === 0) {
            return res.json({ success: false, message: "Appointment not found or not at your hospital" });
        }

        const appt = results[0];

        const updateSql = "UPDATE doctor_appointments SET status = ? WHERE id = ?";
        db.query(updateSql, [status, id], (uErr) => {
            if (uErr) {
                console.error("Update hospital appointment error:", uErr);
                return res.json({ success: false, message: "Failed to update status" });
            }

            // Send notification
            if (appt.user_id) {
                const statusMessages = {
                    confirmed: `${hospitalName} has confirmed your appointment with ${appt.doctor_name} on ${appt.appointment_date} at ${appt.appointment_time}. ✅`,
                    completed: `Your appointment with ${appt.doctor_name} at ${hospitalName} has been marked as completed. Thank you for visiting!`,
                    cancelled: `${hospitalName} has cancelled your appointment with ${appt.doctor_name} on ${appt.appointment_date} at ${appt.appointment_time}.`,
                    pending: `${hospitalName} has set your appointment with ${appt.doctor_name} back to pending.`
                };
                const statusIcons = { confirmed: '✅', completed: '🏥', cancelled: '❌', pending: '🕐' };
                createNotification(appt.user_id, null, `appointment_${status}`,
                    `${statusIcons[status] || '📋'} Appointment ${status.charAt(0).toUpperCase() + status.slice(1)}`,
                    statusMessages[status] || `Your appointment status has been updated to ${status}.`);
            }

            res.json({ success: true, message: "Appointment status updated" });
        });
    });
});


// ✅ HOSPITAL: GET PROFILE
app.get("/hospital/profile/:hospitalName", (req, res) => {
    const { hospitalName } = req.params;
    const sql = "SELECT id, name, email, address, phone, total_beds, available_beds FROM hospitals WHERE name = ?";
    db.query(sql, [hospitalName], (err, results) => {
        if (err) {
            console.error("Fetch hospital profile error:", err);
            return res.json({ success: false, message: "Failed to fetch profile" });
        }
        if (results.length === 0) {
            return res.json({ success: false, message: "Hospital not found" });
        }
        res.json({ success: true, profile: results[0] });
    });
});

// ✅ HOSPITAL: UPDATE PROFILE
app.put("/hospital/profile/:hospitalName", (req, res) => {
    const { hospitalName } = req.params;
    const { address, phone, total_beds, available_beds } = req.body;

    const sql = "UPDATE hospitals SET address = ?, phone = ?, total_beds = ?, available_beds = ? WHERE name = ?";
    db.query(sql, [address, phone, total_beds, available_beds, hospitalName], (err) => {
        if (err) {
            console.error("Update hospital profile error:", err);
            return res.json({ success: false, message: "Failed to update profile" });
        }
        res.json({ success: true, message: "Profile updated successfully" });
    });
});

// ✅ ADMIN APIs:

// ✅ ADMIN: GET ALL HOSPITALS
app.get("/admin/hospitals", (req, res) => {
    const sql = "SELECT id, name, email, phone, address, total_beds, available_beds, created_at FROM hospitals ORDER BY id DESC";
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Fetch hospitals error:", err);
            return res.json({ success: false, message: "Failed to fetch hospitals" });
        }
        res.json({ success: true, hospitals: results });
    });
});

// ✅ ADMIN: DELETE HOSPITAL
app.delete("/admin/hospitals/:id", (req, res) => {
    const { id } = req.params;
    const sql = "DELETE FROM hospitals WHERE id = ?";
    db.query(sql, [id], (err) => {
        if (err) {
            console.error("Delete hospital error:", err);
            return res.json({ success: false, message: "Failed to delete hospital" });
        }
        res.json({ success: true, message: "Hospital deleted successfully" });
    });
});

// ✅ ADMIN LOGIN API
app.post("/admin/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.json({ success: false, message: "Email and password are required" });
    }

    const sql = "SELECT * FROM admins WHERE email=?";
    db.query(sql, [email], async (err, results) => {
        if (err) {
            console.error("Admin login error:", err);
            return res.json({ success: false, message: "Login failed" });
        }

        if (results.length > 0) {
            const admin = results[0];

            try {
                const isHashed = admin.password.startsWith('$2b$') || admin.password.startsWith('$2a$');
                let match = false;

                if (isHashed) {
                    match = await bcrypt.compare(password, admin.password);
                } else {
                    // Allow plain text for initial setup
                    match = (password === admin.password);
                }

                if (match) {
                    res.json({
                        success: true,
                        message: "Admin login successful",
                        adminId: admin.id,
                        adminName: admin.username
                    });
                } else {
                    res.json({ success: false, message: "Invalid admin credentials" });
                }
            } catch (error) {
                console.error("Admin compare error:", error);
                res.json({ success: false, message: "Login failed" });
            }
        } else {
            res.json({ success: false, message: "Invalid admin credentials" });
        }
    });
});

// ✅ DOCTOR SIGNUP API
app.post("/doctor/signup", async (req, res) => {
    const { name, email, password, specialization, degree, hospital, phone, available_days, available_time } = req.body;

    if (!name || !email || !password || !specialization) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    try {
        // Check if email already exists
        db.query("SELECT id FROM doctors WHERE email = ?", [email], async (err, results) => {
            if (err) {
                console.error("Doctor signup check error:", err);
                return res.status(500).json({ success: false, message: "Database error" });
            }

            if (results.length > 0) {
                return res.status(400).json({ success: false, message: "Email already registered as a doctor" });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

            // Insert new doctor
            const sql = `INSERT INTO doctors (name, email, password, specialization, degree, hospital, phone, available_days, available_time, rating) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 4.0)`;
            const values = [name, email, hashedPassword, specialization, degree || '', hospital || '', phone || '', available_days || 'Mon-Fri', available_time || '9:00 AM - 5:00 PM'];

            db.query(sql, values, (err, result) => {
                if (err) {
                    console.error("Doctor insert error:", err);
                    return res.status(500).json({ success: false, message: "Failed to create doctor account" });
                }
                res.json({
                    success: true,
                    message: "Doctor registered successfully",
                    doctorId: result.insertId
                });
            });
        });
    } catch (error) {
        console.error("Doctor signup error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// ✅ DOCTOR LOGIN API
app.post("/doctor/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.json({ success: false, message: "Email and password are required" });
    }

    const sql = "SELECT * FROM doctors WHERE email=?";
    db.query(sql, [email], async (err, results) => {
        if (err) {
            console.error("Doctor login error:", err);
            return res.json({ success: false, message: "Login failed" });
        }

        if (results.length > 0) {
            const doctor = results[0];

            // If doctor has no password set yet, allow first login with any password and set it
            if (!doctor.password) {
                try {
                    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
                    db.query("UPDATE doctors SET password = ? WHERE id = ?", [hashedPassword, doctor.id]);
                    console.log(`✅ Password set for doctor: ${doctor.name}`);
                    return res.json({
                        success: true,
                        message: "Login successful (password set)",
                        doctorId: doctor.id,
                        doctorName: doctor.name,
                        specialization: doctor.specialization
                    });
                } catch (error) {
                    console.error("Doctor password set error:", error);
                    return res.json({ success: false, message: "Login failed" });
                }
            }

            try {
                const isHashed = doctor.password.startsWith('$2b$') || doctor.password.startsWith('$2a$');
                let match = false;

                if (isHashed) {
                    match = await bcrypt.compare(password, doctor.password);
                } else {
                    match = (password === doctor.password);
                }

                if (match) {
                    res.json({
                        success: true,
                        message: "Doctor login successful",
                        doctorId: doctor.id,
                        doctorName: doctor.name,
                        specialization: doctor.specialization
                    });
                } else {
                    res.json({ success: false, message: "Invalid doctor credentials" });
                }
            } catch (error) {
                console.error("Doctor compare error:", error);
                res.json({ success: false, message: "Login failed" });
            }
        } else {
            res.json({ success: false, message: "No doctor found with this email" });
        }
    });
});

// ✅ GET ALL BOOKINGS (for admin dashboard)
app.get("/admin/bookings", (req, res) => {
    const sql = "SELECT * FROM bookings ORDER BY created_at DESC";
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Fetch bookings error:", err);
            return res.json({ success: false, message: "Failed to fetch bookings" });
        }
        res.json({ success: true, bookings: results });
    });
});

// ✅ UPDATE BOOKING STATUS
app.put("/admin/bookings/:id/status", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'dispatched', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
        return res.json({ success: false, message: "Invalid status" });
    }

    const sql = "UPDATE bookings SET status = ? WHERE id = ?";
    db.query(sql, [status, id], (err, result) => {
        if (err) {
            console.error("Update status error:", err);
            return res.json({ success: false, message: "Failed to update status" });
        }
        if (result.affectedRows === 0) {
            return res.json({ success: false, message: "Booking not found" });
        }

        // Stop tracking if cancelled
        if (status === 'cancelled') {
            stopTracking(id);
        }

        res.json({ success: true, message: "Status updated successfully" });
    });
});

// ✅ GET BOOKING STATS (for dashboard cards)
app.get("/admin/stats", (req, res) => {
    const sql = `
SELECT
COUNT(*) as total,
    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
    SUM(CASE WHEN status = 'dispatched' THEN 1 ELSE 0 END) as dispatched,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
        FROM bookings
    `;
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Stats error:", err);
            return res.json({ success: false, message: "Failed to fetch stats" });
        }
        res.json({ success: true, stats: results[0] });
    });
});

// ✅ GET ALL USERS (for admin user management)
app.get("/admin/users", (req, res) => {
    const sql = `
        SELECT u.id, u.name, u.email,
    COUNT(b.id) as total_bookings,
    MAX(b.created_at) as last_booking
        FROM users u
        LEFT JOIN bookings b ON u.id = b.user_id
        GROUP BY u.id, u.name, u.email
        ORDER BY u.id DESC
    `;
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Fetch users error:", err);
            return res.json({ success: false, message: "Failed to fetch users" });
        }
        res.json({ success: true, users: results });
    });
});

// ✅ GET SPECIFIC USER'S BOOKINGS (for admin user detail)
app.get("/admin/users/:userId/bookings", (req, res) => {
    const { userId } = req.params;

    const sql = "SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC";
    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error("Fetch user bookings error:", err);
            return res.json({ success: false, message: "Failed to fetch user bookings" });
        }
        res.json({ success: true, bookings: results });
    });
});

// ✅ ADMIN: GET ALL DOCTORS
app.get("/admin/doctors", (req, res) => {
    const sql = "SELECT * FROM doctors ORDER BY id ASC";
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Fetch doctors error:", err);
            return res.json({ success: false, message: "Failed to fetch doctors" });
        }
        res.json({ success: true, doctors: results });
    });
});

// ✅ ADMIN: ADD NEW DOCTOR
app.post("/admin/doctors", (req, res) => {
    const { name, specialization, degree, hospital, phone, email, available_days, available_time, rating } = req.body;

    if (!name || !specialization) {
        return res.json({ success: false, message: "Name and specialization are required" });
    }

    const sql = `INSERT INTO doctors(name, specialization, degree, hospital, phone, email, available_days, available_time, rating)
VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.query(sql, [name, specialization, degree || null, hospital || null, phone || null, email || null, available_days || 'Mon-Fri', available_time || '9:00 AM - 5:00 PM', rating || 4.0], (err, result) => {
        if (err) {
            console.error("Add doctor error:", err);
            return res.json({ success: false, message: "Failed to add doctor" });
        }
        res.json({ success: true, message: "Doctor added successfully", doctorId: result.insertId });
    });
});

// ✅ ADMIN: UPDATE DOCTOR
app.put("/admin/doctors/:id", (req, res) => {
    const { id } = req.params;
    const { name, specialization, degree, hospital, phone, email, available_days, available_time, rating } = req.body;

    if (!name || !specialization) {
        return res.json({ success: false, message: "Name and specialization are required" });
    }

    const sql = `UPDATE doctors SET name =?, specialization =?, degree =?, hospital =?, phone =?, email =?, available_days =?, available_time =?, rating =? WHERE id =? `;
    db.query(sql, [name, specialization, degree || null, hospital || null, phone || null, email || null, available_days || 'Mon-Fri', available_time || '9:00 AM - 5:00 PM', rating || 4.0, id], (err, result) => {
        if (err) {
            console.error("Update doctor error:", err);
            return res.json({ success: false, message: "Failed to update doctor" });
        }
        if (result.affectedRows === 0) {
            return res.json({ success: false, message: "Doctor not found" });
        }
        res.json({ success: true, message: "Doctor updated successfully" });
    });
});

// ✅ ADMIN: DELETE DOCTOR
app.delete("/admin/doctors/:id", (req, res) => {
    const { id } = req.params;

    const sql = "DELETE FROM doctors WHERE id = ?";
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error("Delete doctor error:", err);
            return res.json({ success: false, message: "Failed to delete doctor" });
        }
        if (result.affectedRows === 0) {
            return res.json({ success: false, message: "Doctor not found" });
        }
        res.json({ success: true, message: "Doctor deleted successfully" });
    });
});

// ============================================
// ✅ AMBULANCE FLEET APIs
// ============================================

// ✅ GET ALL DRIVERS (admin)
app.get("/admin/drivers", (req, res) => {
    db.query("SELECT id, name, email, phone, license_number, status, assigned_ambulance_id, created_at FROM ambulance_drivers ORDER BY created_at DESC", (err, results) => {
        if (err) return res.json({ success: false, message: "Failed to fetch drivers" });
        res.json({ success: true, drivers: results });
    });
});

// ✅ GET ALL AMBULANCES
app.get("/ambulances", (req, res) => {
    const sql = "SELECT * FROM ambulances ORDER BY created_at DESC";
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Fetch ambulances error:", err);
            return res.json({ success: false, message: "Failed to fetch ambulances" });
        }
        res.json({ success: true, ambulances: results });
    });
});

// ✅ ADD NEW AMBULANCE
app.post("/ambulances", (req, res) => {
    const { vehicle_id, plate_number, ambulance_type, equipment, status, area } = req.body;

    if (!vehicle_id || !plate_number) {
        return res.json({ success: false, message: "Vehicle ID and plate number are required" });
    }

    const equipmentMap = { 'ALS': 'Advanced Life Support', 'BLS': 'Basic Life Support', 'PALS': 'Pediatric ALS', 'MICU': 'Mobile ICU' };

    const sql = `INSERT INTO ambulances (vehicle_id, plate_number, ambulance_type, equipment, status, area)
                 VALUES (?, ?, ?, ?, ?, ?)`;
    const values = [
        vehicle_id, plate_number,
        ambulance_type || 'BLS',
        equipment || equipmentMap[ambulance_type] || 'Basic Life Support',
        status || 'available', area || null
    ];

    db.query(sql, values, (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.json({ success: false, message: "Vehicle ID already exists" });
            }
            console.error("Add ambulance error:", err);
            return res.json({ success: false, message: "Failed to add ambulance" });
        }
        res.json({ success: true, message: "Ambulance added successfully", ambulanceId: result.insertId });
    });
});

// ✅ UPDATE AMBULANCE
app.put("/ambulances/:id", (req, res) => {
    const { id } = req.params;
    const { vehicle_id, plate_number, ambulance_type, equipment, status, area } = req.body;

    if (!vehicle_id || !plate_number) {
        return res.json({ success: false, message: "Vehicle ID and plate number are required" });
    }

    const sql = `UPDATE ambulances SET vehicle_id=?, plate_number=?, ambulance_type=?, equipment=?, status=?, area=? WHERE id=?`;
    db.query(sql, [vehicle_id, plate_number, ambulance_type || 'BLS', equipment || 'Basic Life Support', status || 'available', area || null, id], (err, result) => {
        if (err) {
            console.error("Update ambulance error:", err);
            return res.json({ success: false, message: "Failed to update ambulance" });
        }
        if (result.affectedRows === 0) return res.json({ success: false, message: "Ambulance not found" });
        res.json({ success: true, message: "Ambulance updated successfully" });
    });
});

// ✅ UPDATE AMBULANCE STATUS ONLY
app.put("/ambulances/:id/status", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const valid = ['available', 'on-duty', 'maintenance', 'retired'];
    if (!valid.includes(status)) return res.json({ success: false, message: "Invalid status" });

    db.query("UPDATE ambulances SET status=? WHERE id=?", [status, id], (err, result) => {
        if (err) return res.json({ success: false, message: "Failed to update status" });
        if (result.affectedRows === 0) return res.json({ success: false, message: "Ambulance not found" });
        res.json({ success: true, message: "Status updated" });
    });
});

// ✅ DELETE AMBULANCE
app.delete("/ambulances/:id", (req, res) => {
    db.query("DELETE FROM ambulances WHERE id=?", [req.params.id], (err, result) => {
        if (err) return res.json({ success: false, message: "Failed to delete ambulance" });
        if (result.affectedRows === 0) return res.json({ success: false, message: "Ambulance not found" });
        res.json({ success: true, message: "Ambulance deleted" });
    });
});

// ============================================
// ✅ NOTIFICATION HELPER & APIs
// ============================================

function createNotification(userId, bookingId, type, title, message) {
    if (!userId) return;
    const sql = `INSERT INTO notifications (user_id, booking_id, type, title, message) VALUES (?, ?, ?, ?, ?)`;
    db.query(sql, [userId, bookingId || null, type, title, message], (err) => {
        if (err) console.error("Notification insert error:", err.message);
        // Push real-time notification via Socket.IO
        io.to(`user-${userId}`).emit('new-notification', { type, title, message, booking_id: bookingId, created_at: new Date() });
    });
}

function createDoctorNotification(doctorId, bookingId, type, title, message) {
    if (!doctorId) return;
    const sql = `INSERT INTO notifications (doctor_id, booking_id, type, title, message) VALUES (?, ?, ?, ?, ?)`;
    db.query(sql, [doctorId, bookingId || null, type, title, message], (err) => {
        if (err) console.error("Doctor Notification insert error:", err.message);
        // Push real-time notification via Socket.IO
        io.to(`doctor-${doctorId}`).emit('new-notification', { type, title, message, booking_id: bookingId, created_at: new Date() });
    });
}

// GET user notifications
app.get("/user/notifications/:userId", (req, res) => {
    const { userId } = req.params;
    db.query("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50", [userId], (err, results) => {
        if (err) return res.json({ success: false, message: "Failed to fetch notifications" });
        res.json({ success: true, notifications: results });
    });
});

// Mark single notification as read
app.post("/user/notifications/:notificationId/read", (req, res) => {
    db.query("UPDATE notifications SET is_read = 1 WHERE id = ?", [req.params.notificationId], (err) => {
        if (err) return res.json({ success: false });
        res.json({ success: true });
    });
});

// Mark all notifications as read
app.post("/user/notifications/read-all/:userId", (req, res) => {
    db.query("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0", [req.params.userId], (err) => {
        if (err) return res.json({ success: false });
        res.json({ success: true });
    });
});

// GET ambulance details for a booking
app.get("/booking/:bookingId/ambulance-details", (req, res) => {
    const { bookingId } = req.params;
    const sql = `SELECT b.assigned_ambulance_id, b.assigned_driver_id, 
                    a.vehicle_id, a.plate_number, a.ambulance_type, a.equipment, a.area,
                    d.name as drv_name, d.phone as drv_phone, d.license_number
                 FROM bookings b
                 LEFT JOIN ambulances a ON b.assigned_ambulance_id = a.id
                 LEFT JOIN ambulance_drivers d ON b.assigned_driver_id = d.id
                 WHERE b.id = ?`;
    db.query(sql, [bookingId], (err, results) => {
        if (err) return res.json({ success: false, message: "Failed to fetch details" });
        if (results.length === 0) return res.json({ success: false, message: "Booking not found" });
        const r = results[0];
        res.json({
            success: true,
            ambulance: r.assigned_ambulance_id ? {
                vehicle_id: r.vehicle_id, plate_number: r.plate_number,
                ambulance_type: r.ambulance_type, equipment: r.equipment,
                driver_name: r.drv_name || null,
                driver_phone: r.drv_phone || null,
                license_number: r.license_number || null, area: r.area
            } : null
        });
    });
});

// ============================================
// ✅ AMBULANCE DRIVER APIs
// ============================================

// Driver Signup (also registers ambulance)
app.post("/driver/signup", async (req, res) => {
    const { name, email, password, phone, licenseNumber, vehicleId, plateNumber, ambulanceType } = req.body;
    if (!name || !email || !password || !vehicleId || !plateNumber) {
        return res.status(400).json({ success: false, message: "Name, email, password, vehicle ID and plate number required" });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const eqMap = { 'ALS': 'Advanced Life Support', 'BLS': 'Basic Life Support', 'PALS': 'Pediatric ALS', 'MICU': 'Mobile ICU' };

        // First create the ambulance
        db.query("INSERT INTO ambulances (vehicle_id, plate_number, ambulance_type, equipment, status, area, driver_name, driver_phone) VALUES (?, ?, ?, ?, 'available', NULL, ?, ?)",
            [vehicleId, plateNumber, ambulanceType || 'BLS', eqMap[ambulanceType] || 'Basic Life Support', name, phone || null],
            (ambErr, ambResult) => {
                if (ambErr) {
                    if (ambErr.code === 'ER_DUP_ENTRY') return res.json({ success: false, message: "Vehicle ID already registered" });
                    return res.json({ success: false, message: "Failed to register ambulance" });
                }
                const ambulanceId = ambResult.insertId;

                // Then create the driver, linked to the ambulance
                db.query("INSERT INTO ambulance_drivers (name, email, password, phone, license_number, assigned_ambulance_id) VALUES (?, ?, ?, ?, ?, ?)",
                    [name, email, hashedPassword, phone || null, licenseNumber || null, ambulanceId],
                    (drvErr, drvResult) => {
                        if (drvErr) {
                            // Rollback ambulance creation
                            db.query("DELETE FROM ambulances WHERE id = ?", [ambulanceId]);
                            if (drvErr.code === 'ER_DUP_ENTRY') return res.json({ success: false, message: "Email already registered" });
                            return res.json({ success: false, message: "Registration failed" });
                        }
                        res.json({ success: true, message: "Driver & ambulance registered", driverId: drvResult.insertId });
                    });
            });
    } catch (e) { res.json({ success: false, message: "Registration failed" }); }
});

// Driver Login
app.post("/driver/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.json({ success: false, message: "Email and password required" });
    db.query("SELECT * FROM ambulance_drivers WHERE email = ?", [email], async (err, results) => {
        if (err || results.length === 0) return res.json({ success: false, message: "Invalid credentials" });
        const driver = results[0];
        try {
            const match = await bcrypt.compare(password, driver.password);
            if (match) {
                res.json({ success: true, message: "Login successful", driverId: driver.id, driverName: driver.name, email: driver.email, status: driver.status });
            } else { res.json({ success: false, message: "Invalid credentials" }); }
        } catch (e) { res.json({ success: false, message: "Login failed" }); }
    });
});

// Get available/assigned rides for a driver
app.get("/driver/rides/:driverId", (req, res) => {
    const { driverId } = req.params;
    // Get rides assigned to this driver + unassigned pending rides
    const sql = `(SELECT * FROM bookings WHERE assigned_driver_id = ? AND status IN ('dispatched','pending') ORDER BY created_at DESC)
                 UNION ALL
                 (SELECT * FROM bookings WHERE assigned_driver_id IS NULL AND status = 'pending' ORDER BY created_at DESC LIMIT 20)`;
    db.query(sql, [driverId], (err, results) => {
        if (err) return res.json({ success: false, message: "Failed to fetch rides" });
        res.json({ success: true, rides: results });
    });
});

// Get driver's completed rides
app.get("/driver/history/:driverId", (req, res) => {
    db.query("SELECT * FROM bookings WHERE assigned_driver_id = ? AND status IN ('completed','cancelled') ORDER BY created_at DESC LIMIT 50",
        [req.params.driverId], (err, results) => {
            if (err) return res.json({ success: false });
            res.json({ success: true, rides: results });
        });
});

// Driver accepts a ride (assigns their ambulance + starts tracking)
app.put("/driver/rides/:bookingId/accept", async (req, res) => {
    const { bookingId } = req.params;
    const { driverId } = req.body;

    // Get driver's assigned ambulance
    db.query("SELECT * FROM ambulance_drivers WHERE id = ?", [driverId], async (dErr, dResults) => {
        if (dErr || dResults.length === 0) return res.json({ success: false, message: "Driver not found" });
        const driver = dResults[0];
        if (driver.status !== 'available') return res.json({ success: false, message: "You must be available to accept rides" });

        const ambulanceId = driver.assigned_ambulance_id;

        // Assign driver + ambulance to booking, change to dispatched
        db.query("UPDATE bookings SET assigned_driver_id = ?, assigned_ambulance_id = ?, status = 'dispatched' WHERE id = ? AND status = 'pending'",
            [driverId, ambulanceId, bookingId], async (err, result) => {
                if (err) return res.json({ success: false, message: "Failed to accept ride" });
                if (result.affectedRows === 0) return res.json({ success: false, message: "Ride already taken or not available" });

                // Update driver & ambulance status
                db.query("UPDATE ambulance_drivers SET status = 'on_duty' WHERE id = ?", [driverId]);
                if (ambulanceId) db.query("UPDATE ambulances SET status = 'on-duty' WHERE id = ?", [ambulanceId]);

                // Notify user that driver accepted
                db.query("SELECT * FROM bookings WHERE id = ?", [bookingId], async (bErr, bResults) => {
                    if (bErr || bResults.length === 0) return;
                    const booking = bResults[0];

                    // Get ambulance info for notification
                    let ambInfo = '';
                    if (ambulanceId) {
                        const [ambRows] = await new Promise(r => db.query("SELECT * FROM ambulances WHERE id = ?", [ambulanceId], (e, rows) => r([rows || []])));
                        if (ambRows.length > 0) ambInfo = ` Ambulance ${ambRows[0].vehicle_id} with driver ${driver.name}.`;
                    }
                    createNotification(booking.user_id, bookingId, 'ambulance_dispatched', 'Driver Accepted',
                        `A driver has accepted your ride #${bookingId}!${ambInfo} Tracking will start shortly.`);

                    // Start tracking simulation
                    try {
                        let pickupCoords = await geocodeLocation(booking.pickup_location);
                        if (!pickupCoords) pickupCoords = { lat: DISPATCH_ORIGIN.lat + (Math.random() * 0.04 - 0.02), lng: DISPATCH_ORIGIN.lng + (Math.random() * 0.04 - 0.02) };

                        let dropCoords = null;
                        if (booking.drop_location) dropCoords = await geocodeLocation(booking.drop_location);
                        if (!dropCoords) dropCoords = { lat: pickupCoords.lat + (Math.random() * 0.03 - 0.015), lng: pickupCoords.lng + (Math.random() * 0.03 - 0.015) };

                        let route = await getRoute(DISPATCH_ORIGIN.lat, DISPATCH_ORIGIN.lng, pickupCoords.lat, pickupCoords.lng);
                        if (!route) route = generateFallbackRoute(DISPATCH_ORIGIN.lat, DISPATCH_ORIGIN.lng, pickupCoords.lat, pickupCoords.lng);

                        let dropRoute = await getRoute(pickupCoords.lat, pickupCoords.lng, dropCoords.lat, dropCoords.lng);
                        if (!dropRoute) dropRoute = generateFallbackRoute(pickupCoords.lat, pickupCoords.lng, dropCoords.lat, dropCoords.lng);

                        const insertSql = `INSERT INTO ambulance_tracking 
                            (booking_id, ambulance_lat, ambulance_lng, pickup_lat, pickup_lng, drop_lat, drop_lng, route_coords, drop_route_coords, current_step, total_steps, phase, status)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'to_pickup', 'dispatched')`;
                        db.query(insertSql, [
                            bookingId, DISPATCH_ORIGIN.lat, DISPATCH_ORIGIN.lng,
                            pickupCoords.lat, pickupCoords.lng, dropCoords.lat, dropCoords.lng,
                            JSON.stringify(route.coords), JSON.stringify(dropRoute.coords), route.coords.length - 1
                        ], (tErr) => {
                            if (tErr) console.error("Tracking insert error:", tErr);
                            else { startSimulation(bookingId); console.log(`🚑 Tracking started for booking #${bookingId} (driver ${driver.name} accepted)`); }
                        });
                    } catch (trackErr) { console.error("Tracking setup error:", trackErr); }
                });

                res.json({ success: true, message: "Ride accepted! Tracking started." });
            });
    });
});

// Driver completes a ride
app.put("/driver/rides/:bookingId/complete", (req, res) => {
    const { bookingId } = req.params;
    const { driverId } = req.body;
    
    // Mock fare calculation
    const fare = Math.floor(Math.random() * 1500) + 500;
    
    db.query("UPDATE bookings SET status = 'completed', fare = ? WHERE id = ? AND assigned_driver_id = ?", [fare, bookingId, driverId], (err) => {
        if (err) return res.json({ success: false, message: "Failed to complete ride" });
        db.query("UPDATE ambulance_drivers SET status = 'available', total_trips = total_trips + 1, total_earnings = total_earnings + ? WHERE id = ?", [fare, driverId]);
        res.json({ success: true, message: "Ride completed" });
    });
});

// User rates a driver
app.post("/user/bookings/:bookingId/rate", (req, res) => {
    const { bookingId } = req.params;
    const { rating } = req.body;
    
    if (!rating || rating < 1 || rating > 5) return res.json({ success: false, message: "Invalid rating" });

    db.query("UPDATE bookings SET driver_rating = ? WHERE id = ?", [rating, bookingId], (err) => {
        if (err) return res.json({ success: false, message: "Failed to submit rating" });
        
        db.query("SELECT assigned_driver_id FROM bookings WHERE id = ?", [bookingId], (dErr, dRes) => {
            if (dErr || dRes.length === 0 || !dRes[0].assigned_driver_id) return res.json({ success: true });
            const driverId = dRes[0].assigned_driver_id;
            
            db.query("SELECT rating, total_ratings FROM ambulance_drivers WHERE id = ?", [driverId], (rErr, rRes) => {
                if (rErr || rRes.length === 0) return res.json({ success: true });
                const driver = rRes[0];
                const newTotalRatings = driver.total_ratings + 1;
                const newRating = ((driver.rating * driver.total_ratings) + parseInt(rating)) / newTotalRatings;
                
                db.query("UPDATE ambulance_drivers SET rating = ?, total_ratings = ? WHERE id = ?", [newRating, newTotalRatings, driverId]);
                res.json({ success: true, message: "Rating submitted successfully" });
            });
        });
    });
});

// Get Driver Stats
app.get("/driver/stats/:driverId", (req, res) => {
    db.query("SELECT rating, total_trips, total_earnings FROM ambulance_drivers WHERE id = ?", [req.params.driverId], (err, results) => {
        if (err || results.length === 0) return res.json({ success: false });
        res.json({ success: true, stats: results[0] });
    });
});

// Update driver availability status
app.put("/driver/status/:driverId", (req, res) => {
    const { status } = req.body;
    if (!['available', 'on_duty', 'offline'].includes(status)) return res.json({ success: false, message: "Invalid status" });
    db.query("UPDATE ambulance_drivers SET status = ? WHERE id = ?", [status, req.params.driverId], (err) => {
        if (err) return res.json({ success: false });
        res.json({ success: true, message: "Status updated" });
    });
});


// ✅ DOCTOR APPOINTMENT APIs
// ============================================

// ✅ BOOK A DOCTOR APPOINTMENT (public, from frontend)
app.post("/appointments", (req, res) => {
    const { userId, doctorId, doctorName, specialization, doctorDegree, patientName, phone, email, appointmentDate, appointmentTime, reason } = req.body;

    if (!patientName || !doctorName || !appointmentDate || !appointmentTime) {
        return res.json({ success: false, message: "Required fields are missing" });
    }

    const sql = `INSERT INTO doctor_appointments(user_id, doctor_id, doctor_name, specialization, doctor_degree, patient_name, phone, email, appointment_date, appointment_time, reason, status)
                 SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending'
                 FROM DUAL
                 WHERE NOT EXISTS (
                     SELECT 1 FROM doctor_appointments 
                     WHERE doctor_id = ? 
                     AND appointment_date = ? 
                     AND appointment_time = ? 
                     AND status IN ('pending', 'confirmed')
                 )`;

    const params = [
        userId || null, doctorId || null, doctorName, specialization || null, doctorDegree || null, patientName, phone || null, email || null, appointmentDate, appointmentTime, reason || null,
        doctorId || null, appointmentDate, appointmentTime
    ];

    db.query(sql, params, (err, result) => {
        if (err) {
            console.error("Appointment booking error:", err);
            return res.json({ success: false, message: "Failed to book appointment" });
        }
        
        if (result.affectedRows === 0) {
            return res.json({ success: false, message: "This time slot is already booked. Please select a different time." });
        }
        
        // Notify doctor if doctorId is present
        if (doctorId) {
            createDoctorNotification(doctorId, result.insertId, 'new_appointment', 'New Appointment Request', `Patient ${patientName} has requested an appointment on ${appointmentDate} at ${appointmentTime}.`);
        }

        res.json({
            success: true,
            message: "Appointment booked successfully",
            appointmentId: result.insertId
        });
    });
});

// ✅ GET BOOKED TIME SLOTS FOR A DOCTOR
app.get("/doctor/:doctorId/booked-slots", (req, res) => {
    const { doctorId } = req.params;
    const { date } = req.query;

    if (!doctorId || !date) {
        return res.json({ success: false, message: "Missing doctorId or date" });
    }

    const sql = `SELECT appointment_time FROM doctor_appointments 
                 WHERE doctor_id = ? AND appointment_date = ? AND status IN ('pending', 'confirmed')`;
    
    db.query(sql, [doctorId, date], (err, results) => {
        if (err) {
            console.error("Fetch booked slots error:", err);
            return res.json({ success: false, message: "Failed to fetch booked slots" });
        }
        
        const bookedSlots = results.map(row => row.appointment_time);
        res.json({ success: true, bookedSlots });
    });
});

// ✅ ADMIN: GET ALL APPOINTMENTS
app.get("/admin/appointments", (req, res) => {
    const sql = "SELECT * FROM doctor_appointments ORDER BY created_at DESC";
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Fetch appointments error:", err);
            return res.json({ success: false, message: "Failed to fetch appointments" });
        }
        res.json({ success: true, appointments: results });
    });
});

// ✅ ADMIN: UPDATE APPOINTMENT STATUS
app.put("/admin/appointments/:id/status", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
        return res.json({ success: false, message: "Invalid status" });
    }

    const sql = "UPDATE doctor_appointments SET status = ? WHERE id = ?";
    db.query(sql, [status, id], (err, result) => {
        if (err) {
            console.error("Update appointment status error:", err);
            return res.json({ success: false, message: "Failed to update appointment status" });
        }
        if (result.affectedRows === 0) {
            return res.json({ success: false, message: "Appointment not found" });
        }

        // Send appointment status notification to the user
        db.query("SELECT * FROM doctor_appointments WHERE id = ?", [id], (nErr, nRes) => {
            if (!nErr && nRes.length > 0 && nRes[0].user_id) {
                const appt = nRes[0];
                const statusMessages = {
                    confirmed: `Your appointment with ${appt.doctor_name} on ${appt.appointment_date} at ${appt.appointment_time} has been confirmed! ✅`,
                    completed: `Your appointment with ${appt.doctor_name} has been marked as completed. Thank you for visiting!`,
                    cancelled: `Your appointment with ${appt.doctor_name} on ${appt.appointment_date} at ${appt.appointment_time} has been cancelled.`,
                    pending: `Your appointment with ${appt.doctor_name} has been set back to pending.`
                };
                const statusIcons = { confirmed: '✅', completed: '🏥', cancelled: '❌', pending: '🕐' };
                createNotification(appt.user_id, null, `appointment_${status}`,
                    `${statusIcons[status] || '📋'} Appointment ${status.charAt(0).toUpperCase() + status.slice(1)}`,
                    statusMessages[status] || `Your appointment status has been updated to ${status}.`);
            }
        });

        res.json({ success: true, message: "Appointment status updated successfully" });
    });
});

// ✅ ADMIN: GET APPOINTMENT STATS
app.get("/admin/appointment-stats", (req, res) => {
    const sql = `
SELECT
COUNT(*) as total,
    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
    SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
        FROM doctor_appointments
    `;
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Appointment stats error:", err);
            return res.json({ success: false, message: "Failed to fetch appointment stats" });
        }
        res.json({ success: true, stats: results[0] });
    });
});

// ✅ USER: GET MY DOCTOR APPOINTMENTS
app.get("/user/appointments/:userId", (req, res) => {
    const { userId } = req.params;
    const sql = "SELECT * FROM doctor_appointments WHERE user_id = ? ORDER BY created_at DESC";
    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error("Fetch user appointments error:", err);
            return res.json({ success: false, message: "Failed to fetch appointments" });
        }
        res.json({ success: true, appointments: results });
    });
});

// ✅ DOCTOR LOGIN
app.post("/doctor/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.json({ success: false, message: "Email and password required" });
    db.query("SELECT * FROM doctors WHERE email = ?", [email], async (err, results) => {
        if (err || results.length === 0) return res.json({ success: false, message: "Invalid credentials" });
        const doctor = results[0];
        try {
            if (!doctor.password) return res.json({ success: false, message: "Account not setup completely (no password)" });
            const match = await bcrypt.compare(password, doctor.password);
            if (match) {
                res.json({ success: true, message: "Login successful", doctorId: doctor.id, doctorName: doctor.name });
            } else { res.json({ success: false, message: "Invalid credentials" }); }
        } catch (e) { res.json({ success: false, message: "Login failed" }); }
    });
});

// ✅ DOCTOR: GET MY APPOINTMENTS
app.get("/doctor/appointments/:doctorName", (req, res) => {
    const { doctorName } = req.params;
    const sql = "SELECT * FROM doctor_appointments WHERE doctor_name = ? ORDER BY appointment_date DESC, appointment_time DESC";
    db.query(sql, [doctorName], (err, results) => {
        if (err) {
            console.error("Fetch doctor appointments error:", err);
            return res.json({ success: false, message: "Failed to fetch appointments" });
        }
        res.json({ success: true, appointments: results });
    });
});

// ✅ DOCTOR: UPDATE APPOINTMENT STATUS (only their own)
app.put("/doctor/appointments/:id/status", (req, res) => {
    const { id } = req.params;
    const { status, doctorName } = req.body;

    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
        return res.json({ success: false, message: "Invalid status" });
    }

    // Ensure doctor can only update their own appointments
    const sql = "UPDATE doctor_appointments SET status = ? WHERE id = ? AND doctor_name = ?";
    db.query(sql, [status, id, doctorName], (err, result) => {
        if (err) {
            console.error("Doctor update appointment error:", err);
            return res.json({ success: false, message: "Failed to update status" });
        }
        if (result.affectedRows === 0) {
            return res.json({ success: false, message: "Appointment not found or not yours" });
        }

        // Send appointment status notification to the user
        db.query("SELECT * FROM doctor_appointments WHERE id = ?", [id], (nErr, nRes) => {
            if (!nErr && nRes.length > 0 && nRes[0].user_id) {
                const appt = nRes[0];
                const statusMessages = {
                    confirmed: `Dr. ${doctorName} has confirmed your appointment on ${appt.appointment_date} at ${appt.appointment_time}. ✅`,
                    completed: `Your appointment with Dr. ${doctorName} has been marked as completed. Thank you for visiting!`,
                    cancelled: `Dr. ${doctorName} has cancelled your appointment on ${appt.appointment_date} at ${appt.appointment_time}.`,
                    pending: `Dr. ${doctorName} has set your appointment back to pending.`
                };
                const statusIcons = { confirmed: '✅', completed: '🏥', cancelled: '❌', pending: '🕐' };
                createNotification(appt.user_id, null, `appointment_${status}`,
                    `${statusIcons[status] || '📋'} Appointment ${status.charAt(0).toUpperCase() + status.slice(1)}`,
                    statusMessages[status] || `Your appointment status has been updated to ${status}.`);
            }
        });

        res.json({ success: true, message: "Appointment status updated" });
    });
});


// ✅ ADMIN: GET ALL DRIVERS & AMBULANCES
app.get("/admin/fleet/drivers", (req, res) => {
    const sql = `
        SELECT d.*, a.vehicle_id, a.plate_number, a.ambulance_type
        FROM ambulance_drivers d
        LEFT JOIN ambulances a ON d.assigned_ambulance_id = a.id
        ORDER BY d.created_at DESC
    `;
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Fetch drivers error:", err);
            return res.json({ success: false, message: "Failed to fetch fleet data" });
        }
        res.json({ success: true, drivers: results });
    });
});

// ✅ ADMIN: GET LIVE TRACKING DATA
app.get("/admin/fleet/live", (req, res) => {
    const sql = `
        SELECT t.booking_id, t.ambulance_lat, t.ambulance_lng, t.status as tracking_status, 
               b.patient_name, b.phone, d.name as driver_name, a.vehicle_id 
        FROM ambulance_tracking t
        JOIN bookings b ON t.booking_id = b.id
        LEFT JOIN ambulance_drivers d ON b.assigned_driver_id = d.id
        LEFT JOIN ambulances a ON b.assigned_ambulance_id = a.id
        WHERE t.status IN ('dispatched', 'en_route')
    `;
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Fetch live tracking error:", err);
            return res.json({ success: false, message: "Failed to fetch live tracking data" });
        }
        res.json({ success: true, live: results });
    });
});


// ✅ GET ALL DOCTORS
app.get("/doctors", (req, res) => {
    const sql = `
        SELECT d.*, h.address as h_address, h.phone as h_phone, h.total_beds, h.available_beds 
        FROM doctors d 
        LEFT JOIN hospitals h ON d.hospital = h.name 
        ORDER BY d.id DESC
    `;
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Fetch doctors error:", err);
            return res.json({ success: false, message: "Failed to fetch doctors" });
        }
        res.json({ success: true, doctors: results });
    });
});

// ✅ GET DOCTORS BY SPECIALIZATION
app.get("/doctors/specialization/:spec", (req, res) => {
    const { spec } = req.params;
    const sql = `
        SELECT d.*, h.address as h_address, h.phone as h_phone, h.total_beds, h.available_beds 
        FROM doctors d 
        LEFT JOIN hospitals h ON d.hospital = h.name 
        WHERE d.specialization LIKE ? 
        ORDER BY d.rating DESC
    `;
    db.query(sql, [`%${spec}%`], (err, results) => {
        if (err) {
            console.error("Fetch doctors by spec error:", err);
            return res.json({ success: false, message: "Failed to fetch doctors" });
        }
        res.json({ success: true, doctors: results });
    });
});



// ============================================
// ✅ AMBULANCE LIVE TRACKING APIs
// ============================================

// Geocode a location string using Nominatim (OpenStreetMap)
async function geocodeLocation(locationStr) {
    try {
        const encoded = encodeURIComponent(locationStr);
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`, {
            headers: { 'User-Agent': 'TrackNHeal/1.0' }
        });
        const data = await res.json();
        if (data && data.length > 0) {
            return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
    } catch (err) {
        console.error('Geocoding error:', err.message);
    }
    return null;
}

// Get route between two points using OSRM
async function getRoute(fromLat, fromLng, toLat, toLng) {
    try {
        const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&steps=true`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            // Convert GeoJSON coords [lng, lat] to [lat, lng] for Leaflet
            const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
            return {
                coords,
                duration: route.duration, // seconds
                distance: route.distance  // meters
            };
        }
    } catch (err) {
        console.error('OSRM routing error:', err.message);
    }
    return null;
}

// Generate a straight-line route as fallback
function generateFallbackRoute(fromLat, fromLng, toLat, toLng, steps = 50) {
    const coords = [];
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        coords.push([
            fromLat + (toLat - fromLat) * t,
            fromLng + (toLng - fromLng) * t
        ]);
    }
    return { coords, duration: steps * 3, distance: 5000 };
}

// ✅ START TRACKING (called when admin dispatches)
app.post("/tracking/start/:bookingId", async (req, res) => {
    const { bookingId } = req.params;

    // Get booking details
    const bookingSql = "SELECT * FROM bookings WHERE id = ?";
    db.query(bookingSql, [bookingId], async (err, results) => {
        if (err || results.length === 0) {
            return res.json({ success: false, message: "Booking not found" });
        }

        const booking = results[0];

        // Check if tracking already exists
        const checkSql = "SELECT id FROM ambulance_tracking WHERE booking_id = ?";
        db.query(checkSql, [bookingId], async (err, existing) => {
            if (existing && existing.length > 0) {
                startSimulation(bookingId);
                return res.json({ success: true, message: "Tracking restarted" });
            }

            // Geocode pickup location
            let pickupCoords = await geocodeLocation(booking.pickup_location);
            if (!pickupCoords) {
                pickupCoords = {
                    lat: DISPATCH_ORIGIN.lat + (Math.random() * 0.04 - 0.02),
                    lng: DISPATCH_ORIGIN.lng + (Math.random() * 0.04 - 0.02)
                };
            }

            // Geocode drop/hospital location
            let dropCoords = null;
            if (booking.drop_location) {
                dropCoords = await geocodeLocation(booking.drop_location);
            }
            if (!dropCoords) {
                dropCoords = {
                    lat: pickupCoords.lat + (Math.random() * 0.03 - 0.015),
                    lng: pickupCoords.lng + (Math.random() * 0.03 - 0.015)
                };
            }

            // Get route from dispatch to pickup
            let route = await getRoute(DISPATCH_ORIGIN.lat, DISPATCH_ORIGIN.lng, pickupCoords.lat, pickupCoords.lng);
            if (!route) {
                route = generateFallbackRoute(DISPATCH_ORIGIN.lat, DISPATCH_ORIGIN.lng, pickupCoords.lat, pickupCoords.lng);
            }

            // Get route from pickup to hospital
            let dropRoute = await getRoute(pickupCoords.lat, pickupCoords.lng, dropCoords.lat, dropCoords.lng);
            if (!dropRoute) {
                dropRoute = generateFallbackRoute(pickupCoords.lat, pickupCoords.lng, dropCoords.lat, dropCoords.lng);
            }

            // Insert tracking record
            const insertSql = `INSERT INTO ambulance_tracking 
                (booking_id, ambulance_lat, ambulance_lng, pickup_lat, pickup_lng, drop_lat, drop_lng, route_coords, drop_route_coords, current_step, total_steps, phase, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'to_pickup', 'dispatched')`;

            db.query(insertSql, [
                bookingId,
                DISPATCH_ORIGIN.lat, DISPATCH_ORIGIN.lng,
                pickupCoords.lat, pickupCoords.lng,
                dropCoords.lat, dropCoords.lng,
                JSON.stringify(route.coords),
                JSON.stringify(dropRoute.coords),
                route.coords.length - 1
            ], (err, result) => {
                if (err) {
                    console.error("Insert tracking error:", err);
                    return res.json({ success: false, message: "Failed to start tracking" });
                }

                db.query("UPDATE bookings SET status = 'dispatched' WHERE id = ?", [bookingId]);
                startSimulation(bookingId);
                res.json({ success: true, message: "Tracking started", trackingId: result.insertId });
            });
        });
    });
});

// ✅ GET TRACKING STATE
app.get("/tracking/:bookingId", (req, res) => {
    const { bookingId } = req.params;

    const sql = "SELECT * FROM ambulance_tracking WHERE booking_id = ? ORDER BY id DESC LIMIT 1";
    db.query(sql, [bookingId], (err, trackingResults) => {
        if (err) {
            return res.json({ success: false, message: "Failed to fetch tracking data" });
        }

        if (trackingResults.length === 0) {
            return res.json({ success: false, message: "No tracking data found for this booking. The ambulance may not have been dispatched yet." });
        }

        const tracking = trackingResults[0];
        let routeCoords = [];
        let dropRouteCoords = [];
        try {
            routeCoords = typeof tracking.route_coords === 'string'
                ? JSON.parse(tracking.route_coords)
                : tracking.route_coords || [];
        } catch (e) {
            routeCoords = [];
        }
        try {
            dropRouteCoords = typeof tracking.drop_route_coords === 'string'
                ? JSON.parse(tracking.drop_route_coords)
                : tracking.drop_route_coords || [];
        } catch (e) {
            dropRouteCoords = [];
        }

        // Also fetch booking details
        db.query("SELECT * FROM bookings WHERE id = ?", [bookingId], (err, bookingResults) => {
            const booking = bookingResults && bookingResults.length > 0 ? bookingResults[0] : null;

            res.json({
                success: true,
                tracking: {
                    ambulance_lat: tracking.ambulance_lat,
                    ambulance_lng: tracking.ambulance_lng,
                    pickup_lat: tracking.pickup_lat,
                    pickup_lng: tracking.pickup_lng,
                    drop_lat: tracking.drop_lat,
                    drop_lng: tracking.drop_lng,
                    route_coords: routeCoords,
                    drop_route_coords: dropRouteCoords,
                    status: tracking.status,
                    phase: tracking.phase || 'to_pickup',
                    progress: tracking.total_steps > 0 ? (tracking.current_step / tracking.total_steps) * 100 : 0,
                    current_step: tracking.current_step,
                    total_steps: tracking.total_steps
                },
                booking
            });
        });
    });
});

// ===== SIMULATION ENGINE =====
function startSimulation(bookingId) {
    // Stop any existing simulation for this booking
    if (activeSimulations.has(bookingId)) {
        clearInterval(activeSimulations.get(bookingId));
    }

    const sql = "SELECT * FROM ambulance_tracking WHERE booking_id = ? ORDER BY id DESC LIMIT 1";
    db.query(sql, [bookingId], (err, results) => {
        if (err || results.length === 0) return;

        const tracking = results[0];
        const phase = tracking.phase || 'to_pickup';

        // Pick the right route based on phase
        let routeCoords = [];
        try {
            if (phase === 'to_hospital') {
                routeCoords = typeof tracking.drop_route_coords === 'string'
                    ? JSON.parse(tracking.drop_route_coords)
                    : tracking.drop_route_coords || [];
            } else {
                routeCoords = typeof tracking.route_coords === 'string'
                    ? JSON.parse(tracking.route_coords)
                    : tracking.route_coords || [];
            }
        } catch (e) { return; }

        if (routeCoords.length === 0) return;

        let currentStep = tracking.current_step || 0;
        const totalSteps = routeCoords.length - 1;

        console.log(`🚑 Simulation started for booking #${bookingId} phase=${phase} (${totalSteps} steps, resuming at ${currentStep})`);

        const interval = setInterval(() => {
            currentStep++;

            if (currentStep >= totalSteps) {
                currentStep = totalSteps;
                clearInterval(interval);
                activeSimulations.delete(bookingId);

                const finalPos = routeCoords[currentStep];

                if (phase === 'to_pickup') {
                    // Phase 1 complete — arrived at pickup
                    db.query(
                        "UPDATE ambulance_tracking SET ambulance_lat=?, ambulance_lng=?, current_step=?, status='arrived', phase='to_pickup' WHERE booking_id=?",
                        [finalPos[0], finalPos[1], currentStep, bookingId]
                    );

                    // Emit pickup arrival
                    io.to(`tracking-${bookingId}`).emit('ambulance-arrived-pickup', {
                        lat: finalPos[0],
                        lng: finalPos[1]
                    });

                    // Notify user: ambulance at pickup
                    db.query("SELECT user_id FROM bookings WHERE id = ?", [bookingId], (ne, nr) => {
                        if (!ne && nr && nr.length > 0 && nr[0].user_id) {
                            createNotification(nr[0].user_id, bookingId, 'ambulance_at_pickup', 'Ambulance Arrived', `Your ambulance has arrived at the pickup location for booking #${bookingId}.`);
                        }
                    });

                    console.log(`📍 Ambulance arrived at PICKUP for booking #${bookingId}, starting hospital drop...`);

                    // After a 3-second pause, start Phase 2
                    setTimeout(() => {
                        // Re-query DB for fresh drop route data
                        db.query("SELECT * FROM ambulance_tracking WHERE booking_id = ? ORDER BY id DESC LIMIT 1", [bookingId], (err2, freshResults) => {
                            if (err2 || freshResults.length === 0) return;
                            const freshTracking = freshResults[0];

                            let dropRouteCoords = [];
                            try {
                                dropRouteCoords = typeof freshTracking.drop_route_coords === 'string'
                                    ? JSON.parse(freshTracking.drop_route_coords)
                                    : freshTracking.drop_route_coords || [];
                            } catch (e) { dropRouteCoords = []; }

                            const dropTotalSteps = dropRouteCoords.length - 1;
                            if (dropTotalSteps <= 0) {
                                // No drop route, mark completed
                                db.query("UPDATE ambulance_tracking SET status='completed' WHERE booking_id=?", [bookingId]);
                                db.query("UPDATE bookings SET status='completed' WHERE id=?", [bookingId]);
                                io.to(`tracking-${bookingId}`).emit('ambulance-arrived-hospital', { lat: finalPos[0], lng: finalPos[1] });
                                return;
                            }

                            db.query(
                                "UPDATE ambulance_tracking SET phase='to_hospital', current_step=0, total_steps=?, status='dropping' WHERE booking_id=?",
                                [dropTotalSteps, bookingId]
                            );

                            // Emit phase change
                            io.to(`tracking-${bookingId}`).emit('phase-change', {
                                phase: 'to_hospital',
                                drop_route_coords: dropRouteCoords,
                                drop_lat: freshTracking.drop_lat,
                                drop_lng: freshTracking.drop_lng
                            });

                            console.log(`🏥 Phase 2 started: En route to hospital for booking #${bookingId} (${dropTotalSteps} steps)`);

                            // Start Phase 2 simulation
                            startSimulation(bookingId);
                        });
                    }, 3000);

                } else {
                    // Phase 2 complete — arrived at hospital
                    db.query(
                        "UPDATE ambulance_tracking SET ambulance_lat=?, ambulance_lng=?, current_step=?, status='completed', phase='to_hospital' WHERE booking_id=?",
                        [finalPos[0], finalPos[1], currentStep, bookingId]
                    );
                    db.query("UPDATE bookings SET status='completed' WHERE id=?", [bookingId]);

                    // Release assigned ambulance
                    db.query("SELECT assigned_ambulance_id, user_id FROM bookings WHERE id = ?", [bookingId], (ne, nr) => {
                        if (!ne && nr && nr.length > 0) {
                            if (nr[0].assigned_ambulance_id) db.query("UPDATE ambulances SET status = 'available' WHERE id = ?", [nr[0].assigned_ambulance_id]);
                            if (nr[0].user_id) createNotification(nr[0].user_id, bookingId, 'ambulance_at_hospital', 'Patient Delivered', `Patient has been safely delivered to the hospital for booking #${bookingId}. Ride complete!`);
                        }
                    });

                    // Emit hospital arrival
                    io.to(`tracking-${bookingId}`).emit('ambulance-arrived-hospital', {
                        lat: finalPos[0],
                        lng: finalPos[1]
                    });

                    console.log(`🏥 Patient dropped at hospital for booking #${bookingId}`);
                }
                return;
            }

            const pos = routeCoords[currentStep];
            const progress = (currentStep / totalSteps) * 100;
            const remainingSteps = totalSteps - currentStep;
            const etaSeconds = remainingSteps * 2;

            // Determine status based on phase
            let status;
            if (phase === 'to_hospital') {
                status = 'dropping';
            } else {
                status = progress > 10 ? 'en_route' : 'dispatched';
            }

            // Update DB
            db.query(
                "UPDATE ambulance_tracking SET ambulance_lat=?, ambulance_lng=?, current_step=?, status=? WHERE booking_id=?",
                [pos[0], pos[1], currentStep, status, bookingId]
            );

            // Emit to all clients in the tracking room
            io.to(`tracking-${bookingId}`).emit('location-update', {
                lat: pos[0],
                lng: pos[1],
                progress: progress,
                eta_seconds: etaSeconds,
                status: status,
                phase: phase,
                step: currentStep,
                totalSteps: totalSteps
            });

        }, 2000);

        activeSimulations.set(bookingId, interval);
    });
}

// ===== STOP TRACKING (on cancel) =====
function stopTracking(bookingId) {
    // Clear the simulation interval
    if (activeSimulations.has(bookingId)) {
        clearInterval(activeSimulations.get(bookingId));
        activeSimulations.delete(bookingId);
        console.log(`🛑 Tracking stopped for booking #${bookingId}`);
    }

    // Update tracking DB status
    db.query(
        "UPDATE ambulance_tracking SET status = 'completed' WHERE booking_id = ? AND status != 'arrived'",
        [bookingId]
    );

    // Notify all connected clients
    io.to(`tracking-${bookingId}`).emit('tracking-cancelled', {
        message: 'This booking has been cancelled.'
    });
}



// ===== SOCKET.IO CONNECTION HANDLING =====
io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);

    socket.on('join-tracking', (bookingId) => {
        const room = `tracking-${bookingId}`;
        socket.join(room);
        console.log(`📡 Client ${socket.id} joined ${room}`);
    });

    // User joins their notification room
    socket.on('join-user-room', (userId) => {
        if (userId) {
            socket.join(`user-${userId}`);
            console.log(`🔔 Client ${socket.id} joined user-${userId} notifications`);
        }
    });

    // Doctor joins their notification room
    socket.on('register-doctor', (doctorId) => {
        if (doctorId) {
            socket.join(`doctor-${doctorId}`);
            console.log(`🔔 Client ${socket.id} joined doctor-${doctorId} notifications`);
        }
    });

    socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id);
    });
});

// ===== CHATBOT API (LM STUDIO) =====
app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body;
        
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: "Invalid messages format" });
        }

        // Fetch doctors from the database to include in the context
        db.query("SELECT name, specialization, hospital, degree FROM doctors", async (err, results) => {
            if (err) {
                console.error("Database error fetching doctors:", err);
                return res.status(500).json({ error: "Internal server error" });
            }

            // Format doctor list
            let doctorListText = "No doctors currently available in the database.";
            if (results && results.length > 0) {
                doctorListText = results.map(doc => 
                    `- Dr. ${doc.name} (${doc.degree || 'Degree N/A'}), Specialization: ${doc.specialization}, Hospital: ${doc.hospital || 'N/A'}`
                ).join("\\n");
            }

            const systemPrompt = {
                role: "system",
                content: `You are an AI Medical Assistant for TracknHeal. Your job is to help users understand potential diseases based on their symptoms, recommend doctors from our database, and assist them with navigating our website.

Here is the current list of available doctors in our database:
${doctorListText}

Website Navigation Assistance:
- To book an ambulance: Tell the user to click on the "🚑 Book Ambulance" link in the navigation bar.
- To book a doctor appointment: Tell the user to click on the "🩺 Doctor Appointment" link in the navigation bar.
- To access the hospital portal: Tell the user to click on the "🏥 Hospital Portal" link in the navigation bar.

Guidelines:
1. Keep your responses extremely short, concise, and professional (maximum 1-2 sentences). Do not give long explanations.
2. If asked for a doctor recommendation based on symptoms, suggest a doctor from the list above whose specialization matches the required field (e.g., Cardiologist for heart issues).
3. If no matching doctor is found, say we currently don't have a specialist for that in our database but they should still seek medical attention.`
            };

            const lmStudioPayload = {
                model: "local-model", // LM Studio usually ignores this for local models
                messages: [systemPrompt, ...messages],
                temperature: 0.7,
                max_tokens: 150,
                stream: false
            };

            try {
                // Call LM Studio local server
                const response = await fetch("http://127.0.0.1:1234/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(lmStudioPayload)
                });

                if (!response.ok) {
                    throw new Error(`LM Studio API error! status: ${response.status}`);
                }

                const data = await response.json();
                res.json(data);
            } catch (fetchErr) {
                console.error("Error connecting to LM Studio:", fetchErr);
                res.status(500).json({ error: "Could not connect to the AI model. Please ensure LM Studio is running on port 1234." });
            }
        });
    } catch (e) {
        console.error("Chat API error:", e);
        res.status(500).json({ error: "Internal server error" });
    }
});



// Start server
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});
