import "dotenv/config";
import express from "express";
import mysql from "mysql2";
import cors from "cors";
import bodyParser from "body-parser";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10; // Cost factor for bcrypt hashing

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(bodyParser.json());

// ✅ Serve static files from public folder
app.use(express.static(path.join(__dirname, "public")));

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

    // Auto-create doctor_appointments table
    const createApptTable = `
        CREATE TABLE IF NOT EXISTS doctor_appointments(
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    doctor_name VARCHAR(255) NOT NULL,
    specialization VARCHAR(255),
    patient_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    appointment_date DATE NOT NULL,
    appointment_time VARCHAR(20) NOT NULL,
    reason TEXT,
    status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
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
});

// ✅ SIGNUP API (with password hashing)
app.post("/signup", async (req, res) => {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
        return res.json({ message: "All fields are required" });
    }

    try {
        // Hash password with bcrypt
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const sql = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";

        db.query(sql, [name, email, hashedPassword], (err, result) => {
            if (err) {
                if (err.code === "ER_DUP_ENTRY") {
                    return res.json({ message: "Email already exists" });
                }
                console.error("Signup error:", err);
                return res.json({ message: "Signup failed" });
            }
            res.json({ message: "Signup successful", userId: result.insertId });
        });
    } catch (error) {
        console.error("Hashing error:", error);
        res.json({ message: "Signup failed" });
    }
});

// ✅ LOGIN API (with password comparison)
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
                    // Compare with bcrypt
                    match = await bcrypt.compare(password, user.password);
                } else {
                    // Legacy: plain text comparison (for old accounts)
                    match = (password === user.password);
                }

                if (match) {
                    res.json({ success: true, message: "Login successful", userId: user.id, userName: user.name });
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

// ✅ BOOK AMBULANCE API
app.post("/book", (req, res) => {
    const { userId, patientName, phone, pickupLocation, dropLocation, emergencyType, notes } = req.body;

    // Validate required fields
    if (!patientName || !phone || !pickupLocation || !dropLocation || !emergencyType) {
        return res.json({
            success: false,
            message: "All required fields must be filled"
        });
    }

    const sql = `INSERT INTO bookings(user_id, patient_name, phone, pickup_location, drop_location, emergency_type, notes, status)
VALUES(?, ?, ?, ?, ?, ?, ?, 'pending')`;

    db.query(sql, [userId || null, patientName, phone, pickupLocation, dropLocation, emergencyType, notes || ""], (err, result) => {
        if (err) {
            console.error("Booking error:", err);
            return res.json({
                success: false,
                message: "Booking failed. Please try again."
            });
        }
        res.json({
            success: true,
            message: "Booking confirmed!",
            bookingId: result.insertId
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
        db.query(updateSql, [bookingId], (err, result) => {
            if (err) {
                console.error("Cancel booking error:", err);
                return res.json({ success: false, message: "Failed to cancel booking" });
            }
            res.json({ success: true, message: "Booking cancelled successfully" });
        });
    });
});

// ✅ ADMIN APIs:
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
// ✅ DOCTOR APPOINTMENT APIs
// ============================================

// ✅ BOOK A DOCTOR APPOINTMENT (public, from frontend)
app.post("/appointments", (req, res) => {
    const { userId, doctorName, specialization, doctorDegree, patientName, phone, email, appointmentDate, appointmentTime, reason } = req.body;

    if (!patientName || !doctorName || !appointmentDate || !appointmentTime) {
        return res.json({ success: false, message: "Required fields are missing" });
    }

    const sql = `INSERT INTO doctor_appointments(user_id, doctor_name, specialization, doctor_degree, patient_name, phone, email, appointment_date, appointment_time, reason, status)
VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`;

    db.query(sql, [userId || null, doctorName, specialization || null, doctorDegree || null, patientName, phone || null, email || null, appointmentDate, appointmentTime, reason || null], (err, result) => {
        if (err) {
            console.error("Appointment booking error:", err);
            return res.json({ success: false, message: "Failed to book appointment" });
        }
        res.json({
            success: true,
            message: "Appointment booked successfully",
            appointmentId: result.insertId
        });
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
// ✅ DOCTOR: GET MY APPOINTMENTS
app.get("/doctor/appointments/:doctorName", (req, res) => {
    const { doctorName } = req.params;
    const sql = "SELECT * FROM doctor_appointments WHERE doctor_name = ? ORDER BY created_at DESC";
    db.query(sql, [doctorName], (err, results) => {
        if (err) {
            console.error("Fetch doctor appointments error:", err);
            return res.json({ success: false, message: "Failed to fetch appointments" });
        }
        res.json({ success: true, appointments: results });
    });
});


// ✅ GET ALL DOCTORS
app.get("/doctors", (req, res) => {
    const sql = "SELECT * FROM doctors ORDER BY id DESC";
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
    const sql = "SELECT * FROM doctors WHERE specialization LIKE ? ORDER BY rating DESC";
    db.query(sql, [`%${spec}%`], (err, results) => {
        if (err) {
            console.error("Fetch doctors by spec error:", err);
            return res.json({ success: false, message: "Failed to fetch doctors" });
        }
        res.json({ success: true, doctors: results });
    });
});


// AI MEDICAL CHATBOT API (Custom ML)

// Disease → Specialist mapping
const specialistMap = {
    'Heart Attack': 'Cardiologist',
    'Bronchial Asthma': 'Pulmonologist',
    'Hypertension ': 'Cardiologist',
    'Migraine': 'Neurologist',
    'Cervical spondylosis': 'Neurologist',
    'Paralysis (brain hemorrhage)': 'Neurologist',
    'Jaundice': 'Gastroenterologist',
    'Malaria': 'General Physician',
    'Chicken pox': 'General Physician',
    'Dengue': 'General Physician',
    'Typhoid': 'General Physician',
    'hepatitis A': 'Hepatologist',
    'Hepatitis B': 'Hepatologist',
    'Hepatitis C': 'Hepatologist',
    'Hepatitis D': 'Hepatologist',
    'Hepatitis E': 'Hepatologist',
    'Alcoholic hepatitis': 'Hepatologist',
    'Tuberculosis': 'Pulmonologist',
    'Common Cold': 'General Physician',
    'Pneumonia': 'Pulmonologist',
    'Dimorphic hemmorhoids(piles)': 'Gastroenterologist',
    'Varicose veins': 'Vascular Surgeon',
    'Hypothyroidism': 'Endocrinologist',
    'Hyperthyroidism': 'Endocrinologist',
    'Hypoglycemia': 'Endocrinologist',
    'Osteoarthristis': 'Orthopedic',
    'Arthritis': 'Orthopedic',
    'Gastroenteritis': 'Gastroenterologist',
    'Acne': 'Dermatologist',
    'Urinary tract infection': 'Urologist',
    'Psoriasis': 'Dermatologist',
    'Impetigo': 'Dermatologist',
    'Fungal infection': 'Dermatologist',
    'Allergy': 'Dermatologist',
    'GERD': 'Gastroenterologist',
    'Drug Reaction': 'General Physician',
    'Peptic ulcer diseae': 'Gastroenterologist',
    'AIDS': 'General Physician',
    'Diabetes ': 'Endocrinologist',
    'Chronic cholestasis': 'Gastroenterologist',
    '(vertigo) Paroymsal  Positional Vertigo': 'ENT Specialist'
};

app.post("/chat", async (req, res) => {
    const { message, accumulatedSymptoms } = req.body;

    if (!message) {
        return res.json({ success: false, reply: "I didn't catch that. Could you please repeat?" });
    }

    const lowerMsg = message.toLowerCase().trim();
    let reply = "";
    let action = null;
    let richData = null;

    //  1. EMERGENCY DETECTION (Highest Priority)
    const emergencyPatterns = [
        'heart attack', 'stroke', 'unconscious', 'not breathing',
        'severe bleeding', 'accident', 'trauma', 'seizure', 'collapsed',
        'can\'t breathe', 'choking', 'overdose', 'suicide'
    ];
    const isEmergency = emergencyPatterns.some(p => lowerMsg.includes(p));

    if (isEmergency) {
        reply = "🚨 **EMERGENCY DETECTED!** \n\nPlease call an ambulance immediately or visit the nearest hospital. Do you want to book an ambulance now?";
        action = "ambulance";
        return res.json({ success: true, reply, action, richData: null });
    }

    //  2. GREETINGS & CONVERSATIONAL
    if (/^(hi|hello|hey|hola|namaste|good morning|good evening|good afternoon)\b/.test(lowerMsg)) {
        reply = "Hello! 👋 I'm your AI Health Assistant. Here's what I can do:\n\n🔬 **Diagnose symptoms** — Tell me what you're feeling\n📚 **Medical info** — Ask about any disease\n🏥 **Platform guide** — Ask how to book doctors, ambulances, etc.\n\nHow can I help you today?";
        return res.json({ success: true, reply, action: null, richData: null });
    }
    if (/^(thank|thanks|thx|ty|appreciate)/.test(lowerMsg)) {
        reply = "You're welcome! Stay safe and healthy. ❤️ Remember, always consult a doctor for proper diagnosis.";
        return res.json({ success: true, reply, action: null, richData: null });
    }
    if (/^(bye|goodbye|see you|take care)/.test(lowerMsg)) {
        reply = "Take care! 🌟 Don't hesitate to come back if you need health guidance.";
        return res.json({ success: true, reply, action: null, richData: null });
    }

    // 3. ML MODEL ANALYSIS (NLP + FAQ + Follow-ups + Prediction)
    try {
        const mlRes = await fetch("http://localhost:5000/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                text: message,
                accumulated_symptoms: accumulatedSymptoms || []
            })
        });

        const data = await mlRes.json();

        // ── FAQ / Platform Guidance Response ──
        if (data.success && data.type === 'faq') {
            reply = data.answer;
            return res.json({ success: true, reply, action: null, richData: null });
        }

        // ── Follow-up Questions (not enough symptoms yet) ──
        if (data.success && data.type === 'followup') {
            const matchedNames = (data.matched_symptoms || []).map(s => s.replace(/_/g, ' '));
            reply = `I noticed you mentioned: **${matchedNames.join(', ')}**\n\n`;
            reply += "To give you an accurate diagnosis, I need a bit more information:\n\n";
            
            const followups = data.followup_questions || [];
            followups.forEach((q, i) => {
                reply += `${i + 1}. ${q}\n`;
            });
            
            reply += "\nPlease describe any additional symptoms you're experiencing.";

            return res.json({ 
                success: true, 
                reply, 
                action: null, 
                richData: null,
                accumulatedSymptoms: data.matched_symptoms || [],
                needsMoreInfo: true
            });
        }

        // ── Full Diagnosis Response ──
        if (data.success && data.type === 'diagnosis' && data.disease) {
            const disease = data.disease;
            const confidence = (data.confidence * 100).toFixed(1);
            const severity = data.severity || 'unknown';
            const description = data.description || '';
            const precautions = data.precautions || [];
            const top3 = data.top_3 || [];
            const matchedSymptoms = data.matched_symptoms || [];

            // Get specialist recommendation
            const specialist = specialistMap[disease] || 'General Physician';

            // Severity emoji
            const severityEmoji = severity === 'high' ? '🔴' : severity === 'medium' ? '🟠' : '🟢';
            const severityLabel = severity.charAt(0).toUpperCase() + severity.slice(1);

            // Build rich text reply
            reply = `**${severityEmoji} ${disease}** (${confidence}% confidence)\n`;
            reply += `Severity: ${severityLabel}\n\n`;

            if (description) {
                reply += `📋 ${description}\n\n`;
            }

            if (precautions.length > 0) {
                reply += `⚕️ **Precautions:**\n`;
                precautions.forEach(p => {
                    reply += `• ${p.charAt(0).toUpperCase() + p.slice(1)}\n`;
                });
                reply += '\n';
            }

            reply += `👨‍⚕️ Recommended: **${specialist}**`;

            // Query database for available doctors matching the specialist
            const doctorQuery = new Promise((resolve) => {
                const sql = "SELECT id, name, specialization, degree, hospital, rating, available_days, available_time FROM doctors WHERE specialization LIKE ? ORDER BY rating DESC LIMIT 3";
                db.query(sql, [`%${specialist}%`], (err, results) => {
                    if (err || !results || results.length === 0) {
                        resolve([]);
                    } else {
                        resolve(results);
                    }
                });
            });

            const availableDoctors = await doctorQuery;

            if (availableDoctors.length > 0) {
                reply += `\n\n🏥 **Available Doctors:**\n`;
                availableDoctors.forEach(doc => {
                    reply += `• **${doc.name}** (${doc.degree || specialist}) — ${doc.hospital || 'TrackNHeal'} ⭐${doc.rating}\n`;
                });
                reply += `\nYou can book an appointment from the Doctor section below!`;
            }

            // Build richData for enhanced frontend rendering
            richData = {
                disease,
                confidence: parseFloat(confidence),
                severity,
                description,
                precautions,
                specialist,
                matchedSymptoms,
                medications: data.medications || [],
                diets: data.diets || [],
                workouts: data.workouts || [],
                availableDoctors: availableDoctors.map(doc => ({
                    id: doc.id,
                    name: doc.name,
                    specialization: doc.specialization,
                    degree: doc.degree,
                    hospital: doc.hospital,
                    rating: doc.rating,
                    available_days: doc.available_days,
                    available_time: doc.available_time
                })),
                top3: top3.map(t => ({
                    disease: t.disease,
                    confidence: (t.confidence * 100).toFixed(1),
                    severity: t.severity
                }))
            };

            // Set action based on severity
            if (severity === 'high') {
                action = "ambulance";
            } else {
                action = "doctor";
            }

            return res.json({ success: true, reply, action, richData, accumulatedSymptoms: [] });
        }

        // ML returned no symptoms found
        if (data.error === 'no_symptoms_found') {
            reply = "I couldn't identify specific medical symptoms from your message. 🤔\n\nHere are some things you can try:\n• **Describe symptoms**: \"I have a headache, fever, and nausea\"\n• **Ask about a disease**: \"What is diabetes?\"\n• **Platform help**: \"How to book a doctor?\" or \"How to book an ambulance?\"\n• **General info**: \"What services do you offer?\"";
            return res.json({ success: true, reply, action: null, richData: null });
        }

    } catch (err) {
        console.error("ML Server Error:", err.message);
    }

    // 4. FALLBACK
    reply = "I'm having trouble connecting to the diagnosis engine right now. 😔\n\nIn the meantime, you can:\n• **Book an ambulance** using the button on the homepage\n• **Browse doctors** in the Doctor Appointment section\n• Try describing your symptoms again in a moment";
    res.json({ success: true, reply, action: null, richData: null });
});

// Start server
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});
