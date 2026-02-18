
const BASE_URL = 'http://localhost:3000';

async function testDoctorAPI() {
    console.log("🚀 Starting Doctor API Test...");

    // 1. Add a new doctor with degree
    console.log("\n1️⃣ Adding new doctor...");
    const newDoctor = {
        name: "Test Dr. Verify",
        specialization: "Tester",
        degree: "PhD in Testing",
        hospital: "Test Hospital",
        phone: "1234567890",
        email: "test@verify.com"
    };

    let doctorId = null;

    try {
        const addRes = await fetch(`${BASE_URL}/admin/doctors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newDoctor)
        });
        const addData = await addRes.json();
        console.log("Add Response:", addData);

        if (addData.success) {
            doctorId = addData.doctorId;
            console.log("✅ Doctor added with ID:", doctorId);
        } else {
            console.error("❌ Failed to add doctor");
            return;
        }
    } catch (e) {
        console.error("❌ Error adding doctor:", e.message);
        return;
    }

    // 2. Verify doctor details (GET)
    console.log("\n2️⃣ Verifying doctor details...");
    try {
        const getRes = await fetch(`${BASE_URL}/doctors`);
        const getData = await getRes.json();
        const doctor = getData.doctors.find(d => d.id === doctorId);

        if (doctor) {
            console.log("Fetched Doctor:", doctor);
            if (doctor.degree === "PhD in Testing") {
                console.log("✅ Degree matched: PhD in Testing");
            } else {
                console.error("❌ Degree mismatch. Expected 'PhD in Testing', got:", doctor.degree);
            }
        } else {
            console.error("❌ Doctor not found in list");
        }
    } catch (e) {
        console.error("❌ Error fetching doctors:", e.message);
    }

    // 3. Update doctor degree
    console.log("\n3️⃣ Updating doctor degree...");
    try {
        const updateRes = await fetch(`${BASE_URL}/admin/doctors/${doctorId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...newDoctor,
                degree: "master of Testing"
            })
        });
        const updateData = await updateRes.json();
        console.log("Update Response:", updateData);

        if (updateData.success) {
            console.log("✅ Doctor updated successfully");
        } else {
            console.error("❌ Failed to update doctor");
        }
    } catch (e) {
        console.error("❌ Error updating doctor:", e.message);
    }

    // 4. Verify update (GET)
    console.log("\n4️⃣ Verifying update...");
    try {
        const getRes = await fetch(`${BASE_URL}/doctors`);
        const getData = await getRes.json();
        const doctor = getData.doctors.find(d => d.id === doctorId);

        if (doctor) {
            console.log("Fetched Doctor:", doctor);
            if (doctor.degree === "master of Testing") {
                console.log("✅ Degree updated matched: master of Testing");
            } else {
                console.error("❌ Degree update mismatch. Expected 'master of Testing', got:", doctor.degree);
            }
        } else {
            console.error("❌ Doctor not found after update");
        }
    } catch (e) {
        console.error("❌ Error fetching doctors:", e.message);
    }

    // 5. Clean up (Delete doctor)
    console.log("\n5️⃣ Cleaning up...");
    try {
        const delRes = await fetch(`${BASE_URL}/admin/doctors/${doctorId}`, {
            method: 'DELETE'
        });
        const delData = await delRes.json();
        console.log("Delete Response:", delData);
        if (delData.success) {
            console.log("✅ Test doctor deleted");
        } else {
            console.error("❌ Failed to delete test doctor");
        }
    } catch (e) {
        console.error("❌ Error deleting doctor:", e.message);
    }

    console.log("\n🚀 Test Complete.");
}

testDoctorAPI();
