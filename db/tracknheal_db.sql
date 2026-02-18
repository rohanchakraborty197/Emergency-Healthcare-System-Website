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

CREATE TABLE IF NOT EXISTS doctor_appointments (
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
    status ENUM(
        'pending',
        'confirmed',
        'completed',
        'cancelled'
    ) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
);

ALTER TABLE bookings
ADD COLUMN status ENUM(
    'pending',
    'dispatched',
    'completed',
    'cancelled'
) DEFAULT 'pending';

ALTER TABLE bookings ADD COLUMN user_id INT;

INSERT INTO
    admins (username, email, password)
VALUES (
        'admin',
        'admin@tracknheal.com',
        'admin123'
    );

CREATE TABLE IF NOT EXISTS doctors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    degree VARCHAR(100),
    hospital VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    available_days VARCHAR(100) DEFAULT 'Mon-Fri',
    available_time VARCHAR(50) DEFAULT '9:00 AM - 5:00 PM',
    rating DECIMAL(2, 1) DEFAULT 4.0,
    image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample doctors
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
        4.8
    );