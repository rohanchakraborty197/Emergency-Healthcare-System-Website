
import "dotenv/config";
import mysql from "mysql2";

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect(err => {
    if (err) throw err;
    console.log("✅ MySQL Connected");

    const sql = "ALTER TABLE doctor_appointments ADD COLUMN doctor_degree VARCHAR(100)";

    db.query(sql, (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log("⚠️ Column 'doctor_degree' already exists.");
            } else {
                console.error("❌ Error updating schema:", err.message);
            }
        } else {
            console.log("✅ Schema updated: Added 'doctor_degree' column to 'doctor_appointments' table.");
        }
        db.end();
    });
});
