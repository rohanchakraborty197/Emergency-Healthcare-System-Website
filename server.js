import "dotenv/config";
import express from "express";
import mysql from "mysql2";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10; // Cost factor for bcrypt hashing

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
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

    const sql = `INSERT INTO bookings (user_id, patient_name, phone, pickup_location, drop_location, emergency_type, notes, status) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`;

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

// ============================================
// ✅ MEDICAL CHATBOT APIs
// ============================================

// Helper: Extract symptoms from user message
function extractSymptoms(message, symptomList) {
    const lowerMessage = message.toLowerCase().replace(/[^a-z\s]/g, '');
    const words = lowerMessage.split(/\s+/);
    const matched = [];

    for (const symptom of symptomList) {
        const symptomLower = symptom.name.toLowerCase();
        const symptomWords = symptomLower.split(' ');

        // Check if symptom words appear in message
        const allWordsMatch = symptomWords.every(word =>
            words.some(msgWord => msgWord.includes(word) || word.includes(msgWord))
        );

        // Also check for underscore version
        const underscoreVersion = symptomLower.replace(/ /g, '_');

        if (allWordsMatch || lowerMessage.includes(symptomLower) || lowerMessage.includes(underscoreVersion)) {
            matched.push(symptom);
        }
    }

    return matched;
}

// Helper: Calculate disease scores
function calculateDiseaseScores(matchedSymptoms, diseaseSymptomMap) {
    const scores = {};

    for (const symptom of matchedSymptoms) {
        const diseases = diseaseSymptomMap.get(symptom.id) || [];
        for (const diseaseId of diseases) {
            if (!scores[diseaseId]) {
                scores[diseaseId] = { count: 0, weightSum: 0 };
            }
            scores[diseaseId].count++;
            scores[diseaseId].weightSum += symptom.weight;
        }
    }

    return scores;
}

// ✅ CHATBOT ANALYZE SYMPTOMS API
app.post("/chatbot/analyze", async (req, res) => {
    const { userId, message } = req.body;

    if (!message) {
        return res.json({ success: false, message: "Please describe your symptoms" });
    }

    const lowerMessage = message.toLowerCase().trim();

    // Handle greetings and common phrases
    const greetings = ['hi', 'hello', 'hey', 'hii', 'hiii', 'good morning', 'good afternoon', 'good evening', 'howdy'];
    const thanks = ['thank', 'thanks', 'thank you', 'thx'];
    const helpPhrases = ['help', 'what can you do', 'how does this work'];

    if (greetings.some(g => lowerMessage === g || lowerMessage.startsWith(g + ' '))) {
        const greetingResponse = "👋 Hello! I'm your medical assistant. I can help you identify possible health conditions based on your symptoms.\n\nPlease describe what you're feeling, for example:\n• 'I have fever and headache'\n• 'I'm experiencing skin rash and itching'\n• 'I have stomach pain and nausea'";

        return res.json({
            success: true,
            matchedSymptoms: [],
            prediction: null,
            response: greetingResponse
        });
    }

    if (thanks.some(t => lowerMessage.includes(t))) {
        return res.json({
            success: true,
            matchedSymptoms: [],
            prediction: null,
            response: "You're welcome! 😊 Feel free to describe any symptoms if you need more help. Take care and stay healthy!"
        });
    }

    if (helpPhrases.some(h => lowerMessage.includes(h))) {
        return res.json({
            success: true,
            matchedSymptoms: [],
            prediction: null,
            response: "🩺 I'm a medical symptom analyzer. Here's how I can help:\n\n1️⃣ Describe your symptoms (e.g., 'I have fever, cough, and body pain')\n2️⃣ I'll analyze and suggest possible conditions\n3️⃣ You'll get precautions and doctor recommendations\n\n⚠️ Note: This is for guidance only. Always consult a real doctor for proper diagnosis."
        });
    }

    try {
        // 1. Get all symptoms from database
        const getSymptomsQuery = "SELECT id, name, weight FROM symptoms";
        db.query(getSymptomsQuery, (err, symptoms) => {
            if (err) {
                console.error("Error fetching symptoms:", err);
                return res.json({ success: false, message: "Failed to analyze symptoms" });
            }

            // 2. Extract symptoms from message
            const matchedSymptoms = extractSymptoms(message, symptoms);

            if (matchedSymptoms.length === 0) {
                // Save to chat history
                const saveQuery = `INSERT INTO chat_history (user_id, message, response, predicted_disease, severity) VALUES (?, ?, ?, ?, ?)`;
                const botResponse = "I couldn't identify specific symptoms from your message. Please describe your symptoms more clearly.\n\nTry phrases like:\n• 'I have headache and fever'\n• 'I'm feeling nausea and stomach pain'\n• 'I have skin rash and itching'";
                db.query(saveQuery, [userId || null, message, botResponse, null, null]);

                return res.json({
                    success: true,
                    matchedSymptoms: [],
                    prediction: null,
                    response: botResponse
                });
            }

            // 3. Get disease-symptom mappings
            const getMappingsQuery = `
                SELECT ds.disease_id, ds.symptom_id 
                FROM disease_symptoms ds
            `;
            db.query(getMappingsQuery, (err, mappings) => {
                if (err) {
                    console.error("Error fetching mappings:", err);
                    return res.json({ success: false, message: "Failed to analyze symptoms" });
                }

                // Build disease-symptom map
                const diseaseSymptomMap = new Map();
                for (const m of mappings) {
                    if (!diseaseSymptomMap.has(m.symptom_id)) {
                        diseaseSymptomMap.set(m.symptom_id, []);
                    }
                    diseaseSymptomMap.get(m.symptom_id).push(m.disease_id);
                }

                // 4. Calculate disease scores
                const scores = calculateDiseaseScores(matchedSymptoms, diseaseSymptomMap);

                if (Object.keys(scores).length === 0) {
                    const botResponse = "I found some symptoms but couldn't match them to a specific condition. Please consult a doctor for proper diagnosis.";
                    const saveQuery = `INSERT INTO chat_history (user_id, message, response, predicted_disease, severity) VALUES (?, ?, ?, ?, ?)`;
                    db.query(saveQuery, [userId || null, message, botResponse, null, null]);

                    return res.json({
                        success: true,
                        matchedSymptoms: matchedSymptoms.map(s => s.name),
                        prediction: null,
                        response: botResponse
                    });
                }

                // 5. Find best matching disease
                const sortedDiseases = Object.entries(scores)
                    .sort((a, b) => b[1].weightSum - a[1].weightSum);

                const topDiseaseId = sortedDiseases[0][0];

                // 6. Get disease details with precautions
                const getDiseaseQuery = `
                    SELECT d.id, d.name, d.description, d.severity,
                           p.precaution_1, p.precaution_2, p.precaution_3, p.precaution_4
                    FROM diseases d
                    LEFT JOIN precautions p ON d.id = p.disease_id
                    WHERE d.id = ?
                `;
                db.query(getDiseaseQuery, [topDiseaseId], (err, diseaseResults) => {
                    if (err || diseaseResults.length === 0) {
                        console.error("Error fetching disease:", err);
                        return res.json({ success: false, message: "Failed to get disease info" });
                    }

                    const disease = diseaseResults[0];
                    const precautions = [
                        disease.precaution_1,
                        disease.precaution_2,
                        disease.precaution_3,
                        disease.precaution_4
                    ].filter(p => p && p.trim());

                    // 7. Get recommended doctor based on severity
                    let doctorQuery = "SELECT * FROM doctors";
                    if (disease.severity === 'major') {
                        doctorQuery += " ORDER BY rating DESC LIMIT 3";
                    } else {
                        doctorQuery += " WHERE specialization = 'General Physician' LIMIT 2";
                    }

                    db.query(doctorQuery, (err, doctors) => {
                        // Build response
                        let botResponse = `Based on your symptoms, you might have **${disease.name}**.\n\n`;
                        botResponse += `**Severity:** ${disease.severity.charAt(0).toUpperCase() + disease.severity.slice(1)}\n\n`;

                        if (disease.description) {
                            botResponse += `**About:** ${disease.description.substring(0, 200)}...\n\n`;
                        }

                        if (precautions.length > 0) {
                            botResponse += `**Precautions:**\n`;
                            precautions.forEach((p, i) => {
                                botResponse += `${i + 1}. ${p}\n`;
                            });
                        }

                        if (disease.severity === 'major') {
                            botResponse += `\n⚠️ **This condition requires immediate medical attention. Please consult a doctor.**`;
                        }

                        // Save to chat history
                        const saveQuery = `INSERT INTO chat_history (user_id, message, response, predicted_disease, severity) VALUES (?, ?, ?, ?, ?)`;
                        db.query(saveQuery, [userId || null, message, botResponse, disease.name, disease.severity]);

                        res.json({
                            success: true,
                            matchedSymptoms: matchedSymptoms.map(s => s.name),
                            prediction: {
                                disease: disease.name,
                                description: disease.description,
                                severity: disease.severity,
                                precautions: precautions,
                                confidence: Math.min(95, scores[topDiseaseId].count * 15 + scores[topDiseaseId].weightSum * 2)
                            },
                            doctors: doctors || [],
                            response: botResponse
                        });
                    });
                });
            });
        });
    } catch (error) {
        console.error("Chatbot error:", error);
        res.json({ success: false, message: "An error occurred" });
    }
});

// ✅ GET CHAT HISTORY FOR USER
app.get("/chatbot/history/:userId", (req, res) => {
    const { userId } = req.params;

    const sql = `
        SELECT id, message, response, predicted_disease, severity, created_at 
        FROM chat_history 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT 50
    `;

    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error("Fetch chat history error:", err);
            return res.json({ success: false, message: "Failed to fetch history" });
        }
        res.json({ success: true, history: results });
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

// ✅ GET ALL SYMPTOMS (for autocomplete)
app.get("/symptoms", (req, res) => {
    const sql = "SELECT name FROM symptoms ORDER BY name";
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Fetch symptoms error:", err);
            return res.json({ success: false, message: "Failed to fetch symptoms" });
        }
        res.json({ success: true, symptoms: results.map(s => s.name) });
    });
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});
