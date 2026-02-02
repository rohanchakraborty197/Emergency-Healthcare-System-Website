/**
 * Dataset Import Script for Medical Chatbot
 * Run this once to import CSV data into MySQL database
 * Usage: node import_dataset.js
 */

import "dotenv/config";
import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection
const dbConfig = {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "tracknheal_db"
};

// Parse CSV file
function parseCSV(filePath) {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n").filter(line => line.trim());
    const headers = lines[0].split(",").map(h => h.trim());

    return lines.slice(1).map(line => {
        const values = [];
        let current = "";
        let inQuotes = false;

        for (const char of line) {
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === "," && !inQuotes) {
                values.push(current.trim());
                current = "";
            } else {
                current += char;
            }
        }
        values.push(current.trim());

        const obj = {};
        headers.forEach((header, i) => {
            obj[header] = values[i] || "";
        });
        return obj;
    });
}

async function importData() {
    const connection = await mysql.createConnection(dbConfig);
    console.log("✅ Connected to MySQL");

    try {
        // 1. Import Symptoms with severity weights
        console.log("\n📊 Importing symptoms...");
        const severityData = parseCSV(path.join(__dirname, "dataset", "Symptom-severity.csv"));

        for (const row of severityData) {
            if (row.Symptom && row.Symptom !== "prognosis") {
                const symptomName = row.Symptom.trim().replace(/_/g, " ");
                const weight = parseInt(row.weight) || 1;

                await connection.execute(
                    "INSERT IGNORE INTO symptoms (name, weight) VALUES (?, ?)",
                    [symptomName, weight]
                );
            }
        }
        console.log(`   ✓ Imported ${severityData.length} symptoms`);

        // 2. Import Diseases with descriptions
        console.log("\n📊 Importing diseases...");
        const descriptionData = parseCSV(path.join(__dirname, "dataset", "symptom_Description.csv"));

        // Determine severity based on disease type
        const majorDiseases = ["AIDS", "Heart attack", "Paralysis (brain hemorrhage)", "Tuberculosis",
            "Hepatitis E", "Hepatitis B", "Hepatitis C", "Hepatitis D", "Dengue", "Malaria", "Typhoid", "Pneumonia"];
        const moderateDiseases = ["Diabetes", "Hypertension", "Jaundice", "Bronchial Asthma",
            "Chronic cholestasis", "Alcoholic hepatitis", "Hyperthyroidism", "Hypothyroidism"];

        for (const row of descriptionData) {
            if (row.Disease) {
                const diseaseName = row.Disease.trim();
                let severity = "minor";
                if (majorDiseases.some(d => diseaseName.toLowerCase().includes(d.toLowerCase()))) {
                    severity = "major";
                } else if (moderateDiseases.some(d => diseaseName.toLowerCase().includes(d.toLowerCase()))) {
                    severity = "moderate";
                }

                await connection.execute(
                    "INSERT IGNORE INTO diseases (name, description, severity) VALUES (?, ?, ?)",
                    [diseaseName, row.Description || "", severity]
                );
            }
        }
        console.log(`   ✓ Imported ${descriptionData.length} diseases`);

        // 3. Import Disease-Symptom mappings
        console.log("\n📊 Importing disease-symptom mappings...");
        const datasetPath = path.join(__dirname, "dataset", "dataset.csv");
        const datasetContent = fs.readFileSync(datasetPath, "utf-8");
        const datasetLines = datasetContent.split("\n").filter(line => line.trim());

        const diseaseSymptoms = new Map();

        for (let i = 1; i < datasetLines.length; i++) {
            const line = datasetLines[i];
            const parts = line.split(",").map(p => p.trim());
            const diseaseName = parts[0];

            if (!diseaseName) continue;

            if (!diseaseSymptoms.has(diseaseName)) {
                diseaseSymptoms.set(diseaseName, new Set());
            }

            for (let j = 1; j < parts.length; j++) {
                const symptom = parts[j].trim().replace(/_/g, " ");
                if (symptom) {
                    diseaseSymptoms.get(diseaseName).add(symptom);
                }
            }
        }

        let mappingCount = 0;
        for (const [disease, symptoms] of diseaseSymptoms) {
            const [diseaseRows] = await connection.execute(
                "SELECT id FROM diseases WHERE name = ?", [disease]
            );

            if (diseaseRows.length === 0) {
                // Insert disease if not exists
                await connection.execute(
                    "INSERT IGNORE INTO diseases (name, severity) VALUES (?, 'minor')",
                    [disease]
                );
            }

            const [diseaseResult] = await connection.execute(
                "SELECT id FROM diseases WHERE name = ?", [disease]
            );

            if (diseaseResult.length > 0) {
                const diseaseId = diseaseResult[0].id;

                for (const symptom of symptoms) {
                    // Get or create symptom
                    await connection.execute(
                        "INSERT IGNORE INTO symptoms (name, weight) VALUES (?, 1)",
                        [symptom]
                    );

                    const [symptomResult] = await connection.execute(
                        "SELECT id FROM symptoms WHERE name = ?", [symptom]
                    );

                    if (symptomResult.length > 0) {
                        const symptomId = symptomResult[0].id;
                        await connection.execute(
                            "INSERT IGNORE INTO disease_symptoms (disease_id, symptom_id) VALUES (?, ?)",
                            [diseaseId, symptomId]
                        );
                        mappingCount++;
                    }
                }
            }
        }
        console.log(`   ✓ Created ${mappingCount} disease-symptom mappings`);

        // 4. Import Precautions
        console.log("\n📊 Importing precautions...");
        const precautionData = parseCSV(path.join(__dirname, "dataset", "symptom_precaution.csv"));

        for (const row of precautionData) {
            if (row.Disease) {
                const [diseaseResult] = await connection.execute(
                    "SELECT id FROM diseases WHERE name = ?", [row.Disease.trim()]
                );

                if (diseaseResult.length > 0) {
                    const diseaseId = diseaseResult[0].id;
                    await connection.execute(
                        `INSERT INTO precautions (disease_id, precaution_1, precaution_2, precaution_3, precaution_4) 
                         VALUES (?, ?, ?, ?, ?)
                         ON DUPLICATE KEY UPDATE 
                         precaution_1 = VALUES(precaution_1),
                         precaution_2 = VALUES(precaution_2),
                         precaution_3 = VALUES(precaution_3),
                         precaution_4 = VALUES(precaution_4)`,
                        [diseaseId, row.Precaution_1 || "", row.Precaution_2 || "",
                            row.Precaution_3 || "", row.Precaution_4 || ""]
                    );
                }
            }
        }
        console.log(`   ✓ Imported ${precautionData.length} precaution records`);

        // 5. Verify import
        console.log("\n📊 Verifying import...");
        const [diseaseCount] = await connection.execute("SELECT COUNT(*) as count FROM diseases");
        const [symptomCount] = await connection.execute("SELECT COUNT(*) as count FROM symptoms");
        const [mappingCountResult] = await connection.execute("SELECT COUNT(*) as count FROM disease_symptoms");
        const [precautionCount] = await connection.execute("SELECT COUNT(*) as count FROM precautions");
        const [doctorCount] = await connection.execute("SELECT COUNT(*) as count FROM doctors");

        console.log("\n✅ Import complete!");
        console.log("   📌 Diseases:", diseaseCount[0].count);
        console.log("   📌 Symptoms:", symptomCount[0].count);
        console.log("   📌 Disease-Symptom mappings:", mappingCountResult[0].count);
        console.log("   📌 Precautions:", precautionCount[0].count);
        console.log("   📌 Doctors:", doctorCount[0].count);

    } catch (error) {
        console.error("❌ Error:", error.message);
    } finally {
        await connection.end();
        console.log("\n👋 Database connection closed");
    }
}

importData();
