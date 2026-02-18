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


// ✅ GET ALL DOCTORS
app.get("/doctors", (req, res) => {
    const sql = "SELECT * FROM doctors ORDER BY rating DESC";
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

// ============================================
// ✅ AI MEDICAL CHATBOT API
// ============================================
app.post("/chat", async (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.json({ success: false, reply: "I didn't catch that. Could you please repeat?" });
    }

    const lowerMsg = message.toLowerCase();
    let reply = "I'm not sure about that. Please consult a doctor for accurate advice.";
    let action = null;

    // 🚨 1. EMERGENCY DETECTION (Highest Priority)
    if (lowerMsg.includes("pain") || lowerMsg.includes("heart") || lowerMsg.includes("attack") ||
        lowerMsg.includes("stroke") || lowerMsg.includes("breathing") || lowerMsg.includes("unconscious") ||
        lowerMsg.includes("bleeding") || lowerMsg.includes("accident") || lowerMsg.includes("trauma")) {

        reply = "🚨 **EMERGENCY DETECTED!** \n\nPlease call an ambulance immediately or visit the nearest hospital. Do you want to book an ambulance now?";
        action = "ambulance";
        return res.json({ success: true, reply, action });
    }

    // 👋 2. GREETINGS & THANKS
    if (lowerMsg.includes("hi") || lowerMsg.includes("hello") || lowerMsg.includes("hey")) {
        reply = "Hello! 👋 I'm your AI Health Assistant. Tell me your symptoms, and I'll guide you.";
        return res.json({ success: true, reply, action });
    }
    if (lowerMsg.includes("thank")) {
        reply = "You're welcome! Stay safe and healthy. ❤️";
        return res.json({ success: true, reply, action });
    }

    // 🤖 3. ML MODEL PREDICTION
    try {
        const mlRes = await fetch("http://localhost:5000/predict", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ symptoms: [message] })
        });

        const data = await mlRes.json();

        if (data.disease) {
            const disease = data.disease;
            const confidence = (data.confidence * 100).toFixed(1);

            // Map Disease -> Specialist
            const specialistMap = {
                'Heart Attack': 'Cardiologist',
                'Bronchial Asthma': 'Pulmonologist',
                'Hypertension': 'Cardiologist',
                'Migraine': 'Neurologist',
                'Cervical spondylosis': 'Neurologist',
                'Paralysis (brain hemorrhage)': 'Neurologist',
                'Jaundice': 'Gastroenterologist',
                'Malaria': 'General Physician',
                'Chicken pox': 'General Physician',
                'Dengue': 'General Physician',
                'Typhoid': 'General Physician',
                'Hepatitis A': 'Hepatologist',
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
                'Gastroesophageal reflux disease': 'Gastroenterologist',
                'Drug Reaction': 'General Physician',
                'Peptic ulcer diseae': 'Gastroenterologist',
                'AIDS': 'General Physician',
                'Diabetes ': 'Endocrinologist'
            };

            const specialist = specialistMap[disease] || 'General Physician';

            reply = `Based on your symptoms, it could be **${disease}** (${confidence}% confidence).\n\nI recommend consulting a **${specialist}**.`;
            action = "doctor";

            return res.json({ success: true, reply, action });
        }

    } catch (err) {
        console.error("ML Server Error:", err.message);
        // Continue to fallback...
    }

    // ⚠️ 4. FALLBACK (Keyword Matching)
    if (lowerMsg.includes("fever") || lowerMsg.includes("cold") || lowerMsg.includes("cough") || lowerMsg.includes("headache")) {
        reply = "It sounds like you might have a viral infection or flu. Stay hydrated and rest. \n\nI recommend booking an appointment with a **General Physician**.";
        action = "doctor";
    }
    else if (lowerMsg.includes("stomach") || lowerMsg.includes("vomit") || lowerMsg.includes("diarrhea")) {
        reply = "Stomach issues can be due to various reasons. Avoid spicy food. \n\nPlease consult a **Gastroenterologist**.";
        action = "doctor";
    }
    else if (lowerMsg.includes("skin") || lowerMsg.includes("rash") || lowerMsg.includes("itch")) {
        reply = "For skin issues, it's best to see a specialist. \n\nConsider booking a **Dermatologist**.";
        action = "doctor";
    }

    res.json({ success: true, reply, action });
});

// ✅ Start server
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});
