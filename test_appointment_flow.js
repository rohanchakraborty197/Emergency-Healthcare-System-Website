
const BASE_URL = 'http://localhost:3000';

const testDoctor = {
    name: "Dr. Degree Test",
    specialization: "Degree Specialist",
    degree: "MD, PhD in Testing",
    hospital: "Test General",
    phone: "555-0199",
    email: "dr.test@degree.com"
};

const testAppointment = {
    userId: 1,
    patientName: "Test Patient",
    phone: "1234567890",
    email: "patient@test.com",
    appointmentDate: "2025-10-10",
    appointmentTime: "10:00 AM",
    reason: "Testing degree persistence"
};

async function runTest() {
    console.log("🚀 Starting Appointment Degree Flow Test...");

    let doctorId;

    // 1. Create a Doctor with a Degree
    try {
        const res = await fetch(`${BASE_URL}/admin/doctors`, {
            method: 'POST',
            body: JSON.stringify(testDoctor),
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (data.success) {
            doctorId = data.doctorId;
            console.log(`✅ Doctor created with ID: ${doctorId} and Degree: "${testDoctor.degree}"`);
        } else {
            console.error("❌ Failed to create doctor:", data);
            return; // Stop if doctor creation fails
        }
    } catch (e) {
        console.error("❌ Error creating doctor:", e);
        return;
    }

    // 2. Book an Appointment with this Doctor (Simulating Frontend)
    try {
        const appointmentPayload = {
            ...testAppointment,
            doctorName: testDoctor.name,
            specialization: testDoctor.specialization,
            doctorDegree: testDoctor.degree
        };

        const res = await fetch(`${BASE_URL}/appointments`, {
            method: 'POST',
            body: JSON.stringify(appointmentPayload),
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (data.success) {
            console.log(`✅ Appointment booked with ID: ${data.appointmentId}`);
        } else {
            console.error("❌ Failed to book appointment:", data);
            return;
        }
    } catch (e) {
        console.error("❌ Error booking appointment:", e);
        return;
    }

    // 3. Verify the Appointment has the Degree (Admin View)
    try {
        const res = await fetch(`${BASE_URL}/admin/appointments`);
        const data = await res.json();

        if (data.success) {
            // Find our specific test appointment
            // We use patient name and doctor name to be fairly specific
            const appointment = data.appointments.find(a =>
                a.doctor_name === testDoctor.name &&
                a.patient_name === testAppointment.patientName &&
                a.doctor_degree === testDoctor.degree // Check logic here or below
            );

            // Let's find it first without the degree check to be sure it exists
            const foundAppt = data.appointments.find(a =>
                a.doctor_name === testDoctor.name &&
                a.patient_name === testAppointment.patientName
            );

            if (foundAppt) {
                console.log("🔍 Fetched Appointment:", {
                    id: foundAppt.id,
                    doctor: foundAppt.doctor_name,
                    degree: foundAppt.doctor_degree
                });

                if (foundAppt.doctor_degree === testDoctor.degree) {
                    console.log("SUCCESS! ✅ Doctor degree was correctly saved and retrieved.");
                } else {
                    console.error(`FAILURE! ❌ Expected degree "${testDoctor.degree}", but got "${foundAppt.doctor_degree}"`);
                }
            } else {
                console.error("❌ Could not find the created appointment in the list.");
            }
        } else {
            console.error("❌ Failed to fetch appointments:", data);
        }
    } catch (e) {
        console.error("❌ Error fetching appointments:", e);
    }
}

runTest();
