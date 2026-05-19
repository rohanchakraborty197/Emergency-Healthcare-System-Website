CREATE TABLE users (
    id INT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE admins (
    id INT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bookings (
    id INT PRIMARY KEY,
    user_id INT,
    patient_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    pickup_location VARCHAR(255) NOT NULL,
    drop_location VARCHAR(255) NOT NULL,
    emergency_type VARCHAR(100) NOT NULL,
    notes CLOB,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

----- Doctor database -----
CREATE TABLE IF NOT EXISTS doctors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    hospital VARCHAR(255) DEFAULT NULL,
    phone VARCHAR(20) DEFAULT NULL,
    email VARCHAR(255) DEFAULT NULL,
    available_days VARCHAR(100) DEFAULT 'Mon-Fri',
    available_time VARCHAR(50) DEFAULT '9:00 AM - 5:00 PM',
    rating DECIMAL(2, 1) DEFAULT 4.0,
    image_url VARCHAR(500) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    degree VARCHAR(100) DEFAULT NULL,
    password VARCHAR(255) DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS doctor_appointments (
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
    status ENUM(
        'pending',
        'confirmed',
        'completed',
        'cancelled'
    ) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
    FOREIGN KEY (doctor_id) REFERENCES doctors (id) ON DELETE SET NULL
);

ALTER TABLE bookings
ADD COLUMN status ENUM(
    'pending',
    'dispatched',
    'completed',
    'cancelled'
) DEFAULT 'pending';

ALTER TABLE bookings ADD COLUMN user_id INT;

---- ADMIN CREDENTIALS ----
INSERT INTO
    admins (username, email, password) VALUES (
        'admin',
        'admin@tracknheal.com',
        'admin123'
    );

------- SAMPLE DOCTOR DETAILS -------
INSERT INTO
    doctors (
        name,
        specialization,
        degree,
        hospital,
        phone,
        email,
        available_days,
        available_time,
        rating
    )
VALUES (
        'Dr. Arun Sharma',
        'General Physician',
        'MBBS, MD',
        'City General Hospital',
        '9876543210',
        'arun.sharma@hospital.com',
        'Mon-Sat',
        '9:00 AM - 6:00 PM',
        4.5
    ),
    (
        'Dr. Priya Patel',
        'Dermatologist',
        'MBBS, DDVL',
        'Skin Care Clinic',
        '9876543211',
        'priya.patel@clinic.com',
        'Mon-Fri',
        '10:00 AM - 5:00 PM',
        4.8
    ),
    (
        'Dr. Rajesh Kumar',
        'Cardiologist',
        'MBBS, MD, DM',
        'Heart Care Center',
        '9876543212',
        'rajesh.kumar@heartcare.com',
        'Mon-Sat',
        '8:00 AM - 4:00 PM',
        4.7
    ),
    (
        'Dr. Sneha Reddy',
        'Gastroenterologist',
        'MBBS, MD, DM',
        'Digestive Health Institute',
        '9876543213',
        'sneha.reddy@dhi.com',
        'Tue-Sat',
        '9:00 AM - 5:00 PM',
        4.6
    ),
    (
        'Dr. Amit Singh',
        'Pulmonologist',
        'MBBS, MD',
        'Respiratory Care Hospital',
        '9876543214',
        'amit.singh@respiratory.com',
        'Mon-Fri',
        '10:00 AM - 6:00 PM',
        4.4
    ),
    (
        'Dr. Kavitha Nair',
        'Neurologist',
        'MBBS, MD, DM',
        'Brain & Spine Center',
        '9876543215',
        'kavitha.nair@neuro.com',
        'Mon-Sat',
        '9:00 AM - 3:00 PM',
        4.9
    ),
    (
        'Dr. Vikram Mehta',
        'Orthopedic',
        'MBBS, MS',
        'Bone & Joint Hospital',
        '9876543216',
        'vikram.mehta@ortho.com',
        'Mon-Fri',
        '8:00 AM - 5:00 PM',
        4.5
    ),
    (
        'Dr. Anita Desai',
        'Endocrinologist',
        'MBBS, MD, DM',
        'Diabetes Care Center',
        '9876543217',
        'anita.desai@diabetes.com',
        'Wed-Sun',
        '10:00 AM - 6:00 PM',
        4.7
    ),
    (
        'Dr. Suresh Iyer',
        'Infectious Disease',
        'MBBS, MD',
        'Tropical Medicine Hospital',
        '9876543218',
        'suresh.iyer@tropical.com',
        'Mon-Sat',
        '9:00 AM - 5:00 PM',
        4.6
    ),
    (
        'Dr. Meena Krishnan',
        'Hepatologist',
        'MBBS, MD, DM',
        'Liver Care Institute',
        '9876543219',
        'meena.krishnan@liver.com',
        'Mon-Fri',
        '9:00 AM - 4:00 PM',
        4.8),

('Dr. Sanjay Bose', 
'Urologist', 
'MBBS, MS, MCh', 
'Apollo Hospitals', 
'9876543210', 
'sanjay.bose@tracknheal.com'
, 'Mon-Fri', 
'10:00 AM - 4:00 PM',
 4.6),

('Dr. Pallavi Joshi', 
'Urologist', 'MBBS, MS', 
'Ruby General Hospital', 
'9876543211', 
'pallavi.joshi@tracknheal.com', 
'Mon-Sat', 
'9:00 AM - 5:00 PM', 
4.3),

('Dr. Arjun Malhotra', 
'Vascular Surgeon', 
'MBBS, MS, MCh', 
'Fortis Hospital', 
'9876543212', 
'arjun.malhotra@tracknheal.com', 
'Mon-Fri', 
'11:00 AM - 6:00 PM', 
4.5),

('Dr. Ritu Kapoor', 
'Vascular Surgeon', 
'MBBS, MS', 
'Medica Superspecialty', 
'9876543213', 
'ritu.kapoor@tracknheal.com', 
'Tue-Sat', 
'10:00 AM - 5:00 PM', 
4.2),

('Dr. Nikhil Sen', 
'ENT Specialist', 
'MBBS, MS (ENT)', 
'AMRI Hospital', 
'9876543214', 
'nikhil.sen@tracknheal.com', 
'Mon-Sat', 
'9:00 AM - 3:00 PM', 
4.7),

('Dr. Swati Banerjee', 
'ENT Specialist', 
'MBBS, DLO', 
'Belle Vue Clinic', 
'9876543215', 
'swati.banerjee@tracknheal.com', 
'Mon-Fri', 
'10:00 AM - 5:00 PM', 
4.4),

('Dr. Rakesh Verma', 
'General Physician', 
'MBBS, MD', 
'Woodland Hospital', 
'9876543216', 
'rakesh.verma@tracknheal.com', 
'Mon-Sat', 
'8:00 AM - 4:00 PM', 
4.4),

('Dr. Pooja Chatterjee', 
'Hepatologist', 
'MBBS, MD, DM', 
'SSKM Hospital', 
'9876543217', 
'pooja.chatterjee@tracknheal.com', 
'Mon-Fri', 
'10:00 AM - 6:00 PM', 
4.5),

('Dr. Rohan Ghosh', 
'Dermatologist', 
'MBBS, MD, DDVL', 
'Columbia Asia Hospital', 
'9876543218', 
'rohan.ghosh@tracknheal.com', 
'Tue-Sat', 
'11:00 AM - 7:00 PM', 
4.3) 
;


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
        );

----- Ambulance Fleet -----
CREATE TABLE IF NOT EXISTS ambulances (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_id VARCHAR(20) NOT NULL UNIQUE,
    plate_number VARCHAR(30) NOT NULL,
    ambulance_type ENUM('ALS', 'BLS', 'PALS', 'MICU') DEFAULT 'BLS',
    equipment VARCHAR(100) DEFAULT 'Basic Life Support',
    status ENUM('available', 'on-duty', 'maintenance', 'retired') DEFAULT 'available',
    area VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

----- Notifications -----
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    booking_id INT DEFAULT NULL,
    type VARCHAR(50) DEFAULT 'general',
    title VARCHAR(255) NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

----- Ambulance Drivers -----
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
);

----- Add assignment columns to bookings (run if not present) -----
ALTER TABLE bookings ADD COLUMN assigned_ambulance_id INT DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN assigned_driver_id INT DEFAULT NULL;