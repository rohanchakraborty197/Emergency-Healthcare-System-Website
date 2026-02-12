-- ============================================
-- MEDICAL CHATBOT DATABASE TABLES
-- Run this after your existing database setup
-- ============================================

USE tracknheal_db;


CREATE TABLE IF NOT EXISTS diseases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    severity ENUM('minor', 'moderate', 'major') DEFAULT 'minor',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS symptoms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    weight INT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS disease_symptoms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    disease_id INT,
    symptom_id INT,
    UNIQUE KEY unique_mapping (disease_id, symptom_id),
    FOREIGN KEY (disease_id) REFERENCES diseases(id) ON DELETE CASCADE,
    FOREIGN KEY (symptom_id) REFERENCES symptoms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS precautions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    disease_id INT UNIQUE,
    precaution_1 VARCHAR(500),
    precaution_2 VARCHAR(500),
    precaution_3 VARCHAR(500),
    precaution_4 VARCHAR(500),
    FOREIGN KEY (disease_id) REFERENCES diseases(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS doctors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    hospital VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    available_days VARCHAR(100) DEFAULT 'Mon-Fri',
    available_time VARCHAR(50) DEFAULT '9:00 AM - 5:00 PM',
    rating DECIMAL(2,1) DEFAULT 4.0,
    image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    predicted_disease VARCHAR(255),
    severity VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert sample doctors
INSERT INTO doctors (name, specialization, hospital, phone, email, available_days, available_time, rating) VALUES
('Dr. Arun Sharma', 'General Physician', 'City General Hospital', '9876543210', 'arun.sharma@hospital.com', 'Mon-Sat', '9:00 AM - 6:00 PM', 4.5),
('Dr. Priya Patel', 'Dermatologist', 'Skin Care Clinic', '9876543211', 'priya.patel@clinic.com', 'Mon-Fri', '10:00 AM - 5:00 PM', 4.8),
('Dr. Rajesh Kumar', 'Cardiologist', 'Heart Care Center', '9876543212', 'rajesh.kumar@heartcare.com', 'Mon-Sat', '8:00 AM - 4:00 PM', 4.7),
('Dr. Sneha Reddy', 'Gastroenterologist', 'Digestive Health Institute', '9876543213', 'sneha.reddy@dhi.com', 'Tue-Sat', '9:00 AM - 5:00 PM', 4.6),
('Dr. Amit Singh', 'Pulmonologist', 'Respiratory Care Hospital', '9876543214', 'amit.singh@respiratory.com', 'Mon-Fri', '10:00 AM - 6:00 PM', 4.4),
('Dr. Kavitha Nair', 'Neurologist', 'Brain & Spine Center', '9876543215', 'kavitha.nair@neuro.com', 'Mon-Sat', '9:00 AM - 3:00 PM', 4.9),
('Dr. Vikram Mehta', 'Orthopedic', 'Bone & Joint Hospital', '9876543216', 'vikram.mehta@ortho.com', 'Mon-Fri', '8:00 AM - 5:00 PM', 4.5),
('Dr. Anita Desai', 'Endocrinologist', 'Diabetes Care Center', '9876543217', 'anita.desai@diabetes.com', 'Wed-Sun', '10:00 AM - 6:00 PM', 4.7),
('Dr. Suresh Iyer', 'Infectious Disease', 'Tropical Medicine Hospital', '9876543218', 'suresh.iyer@tropical.com', 'Mon-Sat', '9:00 AM - 5:00 PM', 4.6),
('Dr. Meena Krishnan', 'Hepatologist', 'Liver Care Institute', '9876543219', 'meena.krishnan@liver.com', 'Mon-Fri', '9:00 AM - 4:00 PM', 4.8);
