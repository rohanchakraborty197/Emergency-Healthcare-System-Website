CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    patient_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    pickup_location VARCHAR(255) NOT NULL,
    drop_location VARCHAR(255) NOT NULL,
    emergency_type VARCHAR(100) NOT NULL,
    notes TEXT,
    status ENUM('pending', 'dispatched', 'completed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

# Hospital database
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
);

# Doctor database
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



# ADMIN CREDENTIALS
INSERT INTO
    admins (username, email, password) VALUES (
        'admin',
        'admin@tracknheal.com',
        'admin123'
    );

# SAMPLE DOCTOR DETAILS
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

# Ambulance Fleet -----
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

# Notifications -----
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

# Ambulance Drivers -----
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

# Add assignment columns to bookings (run if not present) -----
ALTER TABLE bookings ADD COLUMN assigned_ambulance_id INT DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN assigned_driver_id INT DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN fare DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE bookings ADD COLUMN driver_rating INT DEFAULT NULL;

# Update bookings status ENUM to include all valid states -----
ALTER TABLE bookings MODIFY COLUMN status ENUM(
    'pending',
    'dispatched',
    'completed',
    'cancelled'
) DEFAULT 'pending';

# Add driver info columns to ambulances (run if not present) -----
ALTER TABLE ambulances ADD COLUMN driver_name VARCHAR(255) DEFAULT NULL;
ALTER TABLE ambulances ADD COLUMN driver_phone VARCHAR(20) DEFAULT NULL;

# Add analytics columns to ambulance_drivers (run if not present) -----
ALTER TABLE ambulance_drivers ADD COLUMN rating FLOAT DEFAULT 5.0;
ALTER TABLE ambulance_drivers ADD COLUMN total_ratings INT DEFAULT 0;
ALTER TABLE ambulance_drivers ADD COLUMN total_trips INT DEFAULT 0;
ALTER TABLE ambulance_drivers ADD COLUMN total_earnings DECIMAL(10,2) DEFAULT 0.00;

# Add doctor_id FK constraint to doctor_appointments (run if not present) -----
ALTER TABLE doctor_appointments ADD CONSTRAINT fk_doc_id FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL;

# Update ambulance_tracking status ENUM to include all valid states -----
ALTER TABLE ambulance_tracking MODIFY COLUMN status ENUM(
    'dispatched',
    'en_route',
    'arrived',
    'dropping',
    'completed'
) DEFAULT 'dispatched';



# SAMPLE HOSPITAL DETAILS -------
INSERT INTO hospitals (name, email, password, address, phone, total_beds, available_beds) VALUES
('City General Hospital', 'citygeneralhospital@hospital.com', '$2b$10$KzotcZAyuTOlf9QmAwHG2ONReFzXryHLoHz8dC7CFxp0J20IPhay6', 'City General Hospital Campus, City Center', '9887482345', 241, 27),
('Skin Care Clinic', 'skincareclinic@hospital.com', '$2b$10$KzotcZAyuTOlf9QmAwHG2ONReFzXryHLoHz8dC7CFxp0J20IPhay6', 'Skin Care Clinic Campus, City Center', '9835846329', 87, 34),
('Heart Care Center', 'heartcarecenter@hospital.com', '$2b$10$KzotcZAyuTOlf9QmAwHG2ONReFzXryHLoHz8dC7CFxp0J20IPhay6', 'Heart Care Center Campus, City Center', '9881855308', 140, 42),
('Respiratory Care Hospital', 'respiratorycarehospital@hospital.com', '$2b$10$KzotcZAyuTOlf9QmAwHG2ONReFzXryHLoHz8dC7CFxp0J20IPhay6', 'Respiratory Care Hospital Campus, City Center', '9845481725', 114, 11),
('Brain & Spine Center', 'brainspinecenter@hospital.com', '$2b$10$KzotcZAyuTOlf9QmAwHG2ONReFzXryHLoHz8dC7CFxp0J20IPhay6', 'Brain & Spine Center Campus, City Center', '9828174351', 105, 4),
('Bone & Joint Hospital', 'bonejointhospital@hospital.com', '$2b$10$KzotcZAyuTOlf9QmAwHG2ONReFzXryHLoHz8dC7CFxp0J20IPhay6', 'Bone & Joint Hospital Campus, City Center', '9894073946', 89, 29),
('Diabetes Care Center', 'diabetescarecenter@hospital.com', '$2b$10$KzotcZAyuTOlf9QmAwHG2ONReFzXryHLoHz8dC7CFxp0J20IPhay6', 'Diabetes Care Center Campus, City Center', '9873021463', 79, 27),
('Liver Care Institute', 'livercareinstitute@hospital.com', '$2b$10$KzotcZAyuTOlf9QmAwHG2ONReFzXryHLoHz8dC7CFxp0J20IPhay6', 'Liver Care Institute Campus, City Center', '9855403372', 215, 2),
('Digestive Health Institute', 'digestivehealthinstitute@hospital.com', '$2b$10$KzotcZAyuTOlf9QmAwHG2ONReFzXryHLoHz8dC7CFxp0J20IPhay6', 'Digestive Health Institute Campus, City Center', '9811432780', 143, 34),
('Tropical Medicine Hospital', 'tropicalmedicinehospital@hospital.com', '$2b$10$KzotcZAyuTOlf9QmAwHG2ONReFzXryHLoHz8dC7CFxp0J20IPhay6', 'Tropical Medicine Hospital Campus, City Center', '9810097868', 126, 16),
('Princeton-Plainsboro', 'princetonplainsboro@hospital.com', '$2b$10$KzotcZAyuTOlf9QmAwHG2ONReFzXryHLoHz8dC7CFxp0J20IPhay6', 'Princeton-Plainsboro Campus, City Center', '9871693388', 194, 66),
('Apollo Hospitals', 'apollohospitals@hospital.com', '$2b$10$KzotcZAyuTOlf9QmAwHG2ONReFzXryHLoHz8dC7CFxp0J20IPhay6', 'Apollo Hospitals Campus, City Center', '9895784038', 242, 34),
('Ruby General Hospital', 'rubygeneralhospital@hospital.com', '$2b$10$KzotcZAyuTOlf9QmAwHG2ONReFzXryHLoHz8dC7CFxp0J20IPhay6', 'Ruby General Hospital Campus, City Center', '9818410684', 138, 15),
('Fortis Hospital', 'fortishospital@hospital.com', '$2b$10$KzotcZAyuTOlf9QmAwHG2ONReFzXryHLoHz8dC7CFxp0J20IPhay6', 'Fortis Hospital Campus, City Center', '9831641891', 156, 5),
('Medica Superspecialty', 'medicasuperspecialty@hospital.com', '$2b$10$KzotcZAyuTOlf9QmAwHG2ONReFzXryHLoHz8dC7CFxp0J20IPhay6', 'Medica Superspecialty Campus, City Center', '9824227634', 88, 23),
('AMRI Hospital', 'amrihospital@hospital.com', '$2b$10$KzotcZAyuTOlf9QmAwHG2ONReFzXryHLoHz8dC7CFxp0J20IPhay6', 'AMRI Hospital Campus, City Center', '9893118377', 87, 9),
('Belle Vue Clinic', 'bellevueclinic@hospital.com', '$2b$10$KzotcZAyuTOlf9QmAwHG2ONReFzXryHLoHz8dC7CFxp0J20IPhay6', 'Belle Vue Clinic Campus, City Center', '9873524083', 93, 15),
('Woodland Hospital', 'woodlandhospital@hospital.com', '$2b$10$KzotcZAyuTOlf9QmAwHG2ONReFzXryHLoHz8dC7CFxp0J20IPhay6', 'Woodland Hospital Campus, City Center', '9874213852', 80, 11),
('SSKM Hospital', 'sskmhospital@hospital.com', '$2b$10$KzotcZAyuTOlf9QmAwHG2ONReFzXryHLoHz8dC7CFxp0J20IPhay6', 'SSKM Hospital Campus, City Center', '9852229246', 102, 30),
('Columbia Asia Hospital', 'columbiaasiahospital@hospital.com', '$2b$10$KzotcZAyuTOlf9QmAwHG2ONReFzXryHLoHz8dC7CFxp0J20IPhay6', 'Columbia Asia Hospital Campus, City Center', '9888683943', 210, 100),
('NRS Hospital', 'nrshospital@hospital.com', '$2b$10$KzotcZAyuTOlf9QmAwHG2ONReFzXryHLoHz8dC7CFxp0J20IPhay6', 'NRS Hospital Campus, City Center', '9875755132', 116, 31);

# AUTO-SEEDED DOCTORS -------
INSERT INTO doctors (name, specialization, degree, hospital, phone, email, available_days, available_time, rating, password) VALUES
('Dr. Priya Sen', 'General Physician', 'MBBS, MD', 'AMRI Hospital', '9574751060', 'drpriyasen@hospital.com', 'Tue-Sun', '11:00 AM - 7:00 PM', 4.1, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Anita Nair', 'Gastroenterologist', 'MBBS, DDVL', 'AMRI Hospital', '9859350015', 'dranitanair@hospital.com', 'Wed-Sat', '11:00 AM - 7:00 PM', 4.0, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Simran Chopra', 'Orthopedic', 'MBBS, MD', 'AMRI Hospital', '9975783236', 'drsimranchopra@hospital.com', 'Mon-Fri', '10:00 AM - 6:00 PM', 4.9, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Manoj Mehta', 'Dermatologist', 'MBBS, DDVL', 'Apollo Hospitals', '9996651677', 'drmanojmehta@hospital.com', 'Mon-Fri', '11:00 AM - 7:00 PM', 4.6, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Gaurav Chopra', 'General Physician', 'MBBS, MS', 'Apollo Hospitals', '9571110146', 'drgauravchopra@hospital.com', 'Mon-Sat', '8:00 AM - 4:00 PM', 4.7, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Suresh Kapoor', 'Orthopedic', 'MBBS, MD', 'Apollo Hospitals', '9810964277', 'drsureshkapoor@hospital.com', 'Mon-Fri', '8:00 AM - 4:00 PM', 4.5, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Karan Kumar', 'Neurologist', 'MBBS, DDVL', 'Belle Vue Clinic', '9831133899', 'drkarankumar@hospital.com', 'Mon-Sat', '11:00 AM - 7:00 PM', 4.1, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Pooja Singh', 'Psychiatrist', 'MBBS, DDVL', 'Belle Vue Clinic', '9170008382', 'drpoojasingh@hospital.com', 'Mon,Wed,Fri', '9:00 AM - 5:00 PM', 4.9, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Suresh Mehta', 'General Physician', 'MBBS, DCH', 'Belle Vue Clinic', '9587339077', 'drsureshmehta@hospital.com', 'Wed-Sat', '9:00 AM - 5:00 PM', 4.4, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Vikram Kumar', 'Pediatrician', 'MBBS, DDVL', 'Bone & Joint Hospital', '9862616483', 'drvikramkumar@hospital.com', 'Wed-Sat', '10:00 AM - 6:00 PM', 4.6, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Pooja Kumar', 'Gastroenterologist', 'MBBS, MS', 'Bone & Joint Hospital', '9704343909', 'drpoojakumar@hospital.com', 'Mon-Sat', '8:00 AM - 4:00 PM', 4.4, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Rahul Joshi', 'Oncologist', 'MBBS, DCH', 'Brain & Spine Center', '9926772678', 'drrahuljoshi@hospital.com', 'Mon,Wed,Fri', '9:00 AM - 5:00 PM', 4.3, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Suresh Nair', 'Pulmonologist', 'MBBS, MD, DM', 'Brain & Spine Center', '9974771885', 'drsureshnair@hospital.com', 'Mon,Wed,Fri', '11:00 AM - 7:00 PM', 4.6, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Pooja Nair', 'Oncologist', 'MBBS, MS', 'City General Hospital', '9580889083', 'drpoojanair@hospital.com', 'Wed-Sat', '10:00 AM - 6:00 PM', 4.3, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Ravi Joshi', 'Dermatologist', 'MBBS, DDVL', 'City General Hospital', '9382626599', 'drravijoshi@hospital.com', 'Mon,Wed,Fri', '9:00 AM - 5:00 PM', 4.1, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Manoj Singh', 'Orthopedic', 'MBBS, DCH', 'Columbia Asia Hospital', '9634994798', 'drmanojsingh@hospital.com', 'Tue-Sun', '10:00 AM - 6:00 PM', 4.8, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Amit Desai', 'General Physician', 'MBBS, DCH', 'Columbia Asia Hospital', '9922623338', 'dramitdesai@hospital.com', 'Wed-Sat', '9:00 AM - 5:00 PM', 4.2, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Deepa Das', 'Pulmonologist', 'MBBS, DDVL', 'Columbia Asia Hospital', '9141159128', 'drdeepadas@hospital.com', 'Mon-Sat', '11:00 AM - 7:00 PM', 4.3, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Anjali Bose', 'Dermatologist', 'MBBS, MD', 'Diabetes Care Center', '9355021686', 'dranjalibose@hospital.com', 'Mon,Wed,Fri', '8:00 AM - 4:00 PM', 4.6, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Anita Singh', 'Psychiatrist', 'MBBS, DDVL', 'Diabetes Care Center', '9917116715', 'dranitasingh@hospital.com', 'Wed-Sat', '8:00 AM - 4:00 PM', 4.8, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Anita Nair', 'Endocrinologist', 'MBBS, MD', 'Digestive Health Institute', '9766949618', 'dranitanair@hospital.com', 'Mon-Sat', '8:00 AM - 4:00 PM', 4.7, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Anjali Chopra', 'Oncologist', 'MBBS, MD, DM', 'Digestive Health Institute', '9123009985', 'dranjalichopra@hospital.com', 'Wed-Sat', '8:00 AM - 4:00 PM', 4.3, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Simran Singh', 'Pulmonologist', 'MBBS, DCH', 'Digestive Health Institute', '9993584207', 'drsimransingh@hospital.com', 'Tue-Sun', '8:00 AM - 4:00 PM', 4.3, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Sneha Gupta', 'Cardiologist', 'MBBS, DDVL', 'Fortis Hospital', '9429046291', 'drsnehagupta@hospital.com', 'Wed-Sat', '10:00 AM - 6:00 PM', 4.1, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Ravi Das', 'Neurologist', 'MBBS, MS', 'Fortis Hospital', '9906221585', 'drravidas@hospital.com', 'Mon-Sat', '9:00 AM - 5:00 PM', 4.7, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Suresh Joshi', 'Gastroenterologist', 'MBBS, MD, DM', 'Fortis Hospital', '9660661361', 'drsureshjoshi@hospital.com', 'Wed-Sat', '10:00 AM - 6:00 PM', 4.4, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Rahul Reddy', 'Dermatologist', 'MBBS, DCH', 'Heart Care Center', '9385549761', 'drrahulreddy@hospital.com', 'Tue-Sun', '9:00 AM - 5:00 PM', 4.7, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Priya Nair', 'Endocrinologist', 'MBBS, MD', 'Heart Care Center', '9222082736', 'drpriyanair@hospital.com', 'Mon-Fri', '9:00 AM - 5:00 PM', 4.8, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Rahul Mehta', 'Pulmonologist', 'MBBS, DDVL', 'Liver Care Institute', '9939704708', 'drrahulmehta@hospital.com', 'Mon-Sat', '9:00 AM - 5:00 PM', 4.6, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Rajesh Sen', 'Pulmonologist', 'MBBS, DCH', 'Liver Care Institute', '9203857352', 'drrajeshsen@hospital.com', 'Mon,Wed,Fri', '11:00 AM - 7:00 PM', 4.2, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Anjali Verma', 'Orthopedic', 'MBBS, MD, DM', 'Liver Care Institute', '9677691742', 'dranjaliverma@hospital.com', 'Tue-Sun', '10:00 AM - 6:00 PM', 4.3, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Ravi Chopra', 'Cardiologist', 'MBBS, DCH', 'Medica Superspecialty', '9244487581', 'drravichopra@hospital.com', 'Mon-Fri', '11:00 AM - 7:00 PM', 4.1, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Manoj Patel', 'Endocrinologist', 'MBBS, MD, DM', 'Medica Superspecialty', '9539310723', 'drmanojpatel@hospital.com', 'Mon-Sat', '9:00 AM - 5:00 PM', 4.8, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Deepa Desai', 'Cardiologist', 'MBBS, DCH', 'Medica Superspecialty', '9595509379', 'drdeepadesai@hospital.com', 'Mon-Fri', '9:00 AM - 5:00 PM', 4.4, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Vikram Bose', 'Cardiologist', 'MBBS, DCH', 'NRS Hospital', '9858818827', 'drvikrambose@hospital.com', 'Mon-Fri', '10:00 AM - 6:00 PM', 4.9, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Anita Reddy', 'Dermatologist', 'MBBS, MD, DM', 'NRS Hospital', '9364101759', 'dranitareddy@hospital.com', 'Mon-Fri', '11:00 AM - 7:00 PM', 4.0, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Anita Reddy', 'Pediatrician', 'MBBS, MS', 'NRS Hospital', '9442849605', 'dranitareddy@hospital.com', 'Wed-Sat', '11:00 AM - 7:00 PM', 4.6, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Neha Joshi', 'Orthopedic', 'MBBS, MD', 'NRS Sealdah', '9488356184', 'drnehajoshi@hospital.com', 'Wed-Sat', '11:00 AM - 7:00 PM', 4.1, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Sneha Bose', 'General Physician', 'MBBS, MS', 'NRS Sealdah', '9675297559', 'drsnehabose@hospital.com', 'Mon,Wed,Fri', '10:00 AM - 6:00 PM', 4.2, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Gaurav Desai', 'Gastroenterologist', 'MBBS, MD', 'NRS Sealdah', '9500889091', 'drgauravdesai@hospital.com', 'Tue-Sun', '8:00 AM - 4:00 PM', 4.8, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Pooja Sen', 'Endocrinologist', 'MBBS, MD', 'NRS Sealdah', '9920075352', 'drpoojasen@hospital.com', 'Wed-Sat', '9:00 AM - 5:00 PM', 4.6, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Anita Sharma', 'Psychiatrist', 'MBBS, MD', 'Princeton-Plainsboro', '9946067558', 'dranitasharma@hospital.com', 'Tue-Sun', '11:00 AM - 7:00 PM', 4.8, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Priya Kumar', 'Pediatrician', 'MBBS, MD, DM', 'Princeton-Plainsboro', '9473075975', 'drpriyakumar@hospital.com', 'Mon-Sat', '11:00 AM - 7:00 PM', 4.4, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Karan Sharma', 'Oncologist', 'MBBS, DCH', 'Princeton-Plainsboro', '9858147074', 'drkaransharma@hospital.com', 'Wed-Sat', '8:00 AM - 4:00 PM', 4.2, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Amit Chopra', 'Orthopedic', 'MBBS, DCH', 'Respiratory Care Hospital', '9820283382', 'dramitchopra@hospital.com', 'Mon,Wed,Fri', '11:00 AM - 7:00 PM', 4.6, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Simran Bose', 'Endocrinologist', 'MBBS, MD, DM', 'Respiratory Care Hospital', '9407955081', 'drsimranbose@hospital.com', 'Mon,Wed,Fri', '9:00 AM - 5:00 PM', 4.2, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Sneha Sharma', 'Orthopedic', 'MBBS, DDVL', 'Ruby General Hospital', '9932965557', 'drsnehasharma@hospital.com', 'Mon,Wed,Fri', '9:00 AM - 5:00 PM', 4.4, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Anita Joshi', 'Pediatrician', 'MBBS, DCH', 'Ruby General Hospital', '9938903339', 'dranitajoshi@hospital.com', 'Mon-Sat', '11:00 AM - 7:00 PM', 4.6, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Deepa Verma', 'Psychiatrist', 'MBBS, MD, DM', 'Ruby General Hospital', '9485090353', 'drdeepaverma@hospital.com', 'Tue-Sun', '9:00 AM - 5:00 PM', 4.3, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Neha Sen', 'Pulmonologist', 'MBBS, MD, DM', 'Skin Care Clinic', '9778767306', 'drnehasen@hospital.com', 'Mon-Sat', '9:00 AM - 5:00 PM', 4.3, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Simran Verma', 'Pediatrician', 'MBBS, MD, DM', 'Skin Care Clinic', '9509749843', 'drsimranverma@hospital.com', 'Wed-Sat', '11:00 AM - 7:00 PM', 4.9, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Vikram Verma', 'Pulmonologist', 'MBBS, DCH', 'SSKM Hospital', '9566657936', 'drvikramverma@hospital.com', 'Tue-Sun', '9:00 AM - 5:00 PM', 4.6, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Vikram Kapoor', 'Orthopedic', 'MBBS, DCH', 'SSKM Hospital', '9184955253', 'drvikramkapoor@hospital.com', 'Tue-Sun', '11:00 AM - 7:00 PM', 4.2, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Karan Gupta', 'Cardiologist', 'MBBS, MD, DM', 'SSKM Hospital', '9802704578', 'drkarangupta@hospital.com', 'Tue-Sun', '9:00 AM - 5:00 PM', 4.7, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Suresh Joshi', 'Pediatrician', 'MBBS, MD', 'Tropical Medicine Hospital', '9252694168', 'drsureshjoshi@hospital.com', 'Mon,Wed,Fri', '8:00 AM - 4:00 PM', 4.2, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Sneha Bose', 'General Physician', 'MBBS, MD', 'Tropical Medicine Hospital', '9614147024', 'drsnehabose@hospital.com', 'Mon-Sat', '10:00 AM - 6:00 PM', 4.5, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Deepa Joshi', 'Pediatrician', 'MBBS, DCH', 'Tropical Medicine Hospital', '9577700851', 'drdeepajoshi@hospital.com', 'Tue-Sun', '11:00 AM - 7:00 PM', 4.4, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Vikram Verma', 'General Physician', 'MBBS, MD', 'Woodland Hospital', '9129035470', 'drvikramverma@hospital.com', 'Mon-Sat', '10:00 AM - 6:00 PM', 4.4, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Simran Kapoor', 'Pediatrician', 'MBBS, MS', 'Woodland Hospital', '9999510709', 'drsimrankapoor@hospital.com', 'Mon-Sat', '11:00 AM - 7:00 PM', 4.5, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.'),
('Dr. Simran Patel', 'Cardiologist', 'MBBS, DCH', 'Woodland Hospital', '9963360511', 'drsimranpatel@hospital.com', 'Wed-Sat', '8:00 AM - 4:00 PM', 4.1, '$2b$10$CfQtv0eps./SvMboex7./eN6ZFMJXBjTv8RLCPi7PfLN76m/6yDy.');
