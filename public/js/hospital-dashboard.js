// Hospital Dashboard Logic

document.addEventListener('DOMContentLoaded', () => {
    const hospitalName = localStorage.getItem('hospitalName');
    const hospitalId = localStorage.getItem('hospitalId');

    if (!hospitalName || !hospitalId) {
        window.location.href = '/hospital-login.html';
        return;
    }

    document.getElementById('hospitalName').textContent = hospitalName;
    loadDoctors();
    loadAppointments();
    loadProfile();
});

function handleLogout() {
    localStorage.removeItem('hospitalId');
    localStorage.removeItem('hospitalName');
    window.location.href = '/hospital-login.html';
}

function switchTab(tabId) {
    document.querySelectorAll('.section-view').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));

    document.getElementById(tabId + 'View').classList.add('active');
    document.getElementById('tab' + tabId.charAt(0).toUpperCase() + tabId.slice(1)).classList.add('active');
}

async function loadDoctors() {
    const hospitalName = localStorage.getItem('hospitalName');
    const tbody = document.getElementById('doctorsTable');
    tbody.innerHTML = '<tr><td colspan="6" class="loading-text">Loading doctors...</td></tr>';

    try {
        const response = await fetch(`/hospital/doctors/${encodeURIComponent(hospitalName)}`);
        const data = await response.json();

        if (data.success) {
            document.getElementById('tabDoctorsCount').textContent = data.doctors.length;
            
            if (data.doctors.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--text-muted);">No doctors found for your hospital.</td></tr>';
                return;
            }

            tbody.innerHTML = data.doctors.map(doc => `
                <tr>
                    <td>#DOC-${String(doc.id).padStart(3, '0')}</td>
                    <td>
                        <div style="font-weight:600; color:var(--text-light)">${escapeHtml(doc.name)}</div>
                        <div style="font-size:0.85em; color:var(--text-muted)">${escapeHtml(doc.degree || '')}</div>
                    </td>
                    <td>
                        <span class="badge" style="background:rgba(99,102,241,0.15); color:var(--accent-primary)">
                            ${escapeHtml(doc.specialization)}
                        </span>
                    </td>
                    <td>
                        <div>${doc.phone ? escapeHtml(doc.phone) : '—'}</div>
                        <div style="font-size:0.85em; color:var(--text-muted)">${doc.email ? escapeHtml(doc.email) : '—'}</div>
                    </td>
                    <td>
                        <div style="font-size:0.9em">
                            <div>🗓️ ${escapeHtml(doc.available_days || 'Mon-Fri')}</div>
                            <div style="color:var(--text-muted)">⏰ ${escapeHtml(doc.available_time || '9:00 AM - 5:00 PM')}</div>
                        </div>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-action edit" onclick='editDoctor(${JSON.stringify(doc).replace(/'/g, "&#39;")})'>✏️</button>
                            <button class="btn-action delete" onclick="deleteDoctor(${doc.id}, '${escapeHtml(doc.name)}')">🗑️</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error("Error loading doctors:", error);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--danger)">Failed to load doctors</td></tr>';
    }
}

async function loadAppointments() {
    const hospitalName = localStorage.getItem('hospitalName');
    const tbody = document.getElementById('appointmentsTable');
    tbody.innerHTML = '<tr><td colspan="7" class="loading-text">Loading appointments...</td></tr>';

    try {
        const response = await fetch(`/hospital/appointments/${encodeURIComponent(hospitalName)}`);
        const data = await response.json();

        if (data.success) {
            const appts = data.appointments;
            
            // Update stats
            const pending = appts.filter(a => a.status === 'pending').length;
            const confirmed = appts.filter(a => a.status === 'confirmed').length;
            const completed = appts.filter(a => a.status === 'completed').length;

            document.getElementById('tabAppointmentsCount').textContent = appts.length;
            document.getElementById('apptTotalCount').textContent = appts.length;
            document.getElementById('apptPendingCount').textContent = pending;
            document.getElementById('apptConfirmedCount').textContent = confirmed;
            document.getElementById('apptCompletedCount').textContent = completed;

            if (appts.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted);">No appointments found.</td></tr>';
                return;
            }

            tbody.innerHTML = appts.map(appt => `
                <tr>
                    <td>#APT-${String(appt.id).padStart(4, '0')}</td>
                    <td>
                        <div style="font-weight:600; color:var(--text-light)">${escapeHtml(appt.patient_name)}</div>
                        <div style="font-size:0.85em; color:var(--text-muted)">ID: ${appt.user_id}</div>
                    </td>
                    <td>
                        <div style="font-weight:500">${escapeHtml(appt.doctor_name)}</div>
                        <div style="font-size:0.85em; color:var(--text-muted)">${escapeHtml(appt.specialization)}</div>
                    </td>
                    <td>
                        <div>${formatDate(appt.appointment_date)}</div>
                        <div style="color:var(--text-muted); font-size:0.85em">${appt.appointment_time}</div>
                    </td>
                    <td>${escapeHtml(appt.phone || '—')}</td>
                    <td>
                        <span class="status-badge status-${appt.status}">
                            ${appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons" style="flex-wrap: wrap;">
                            <button class="btn-action edit" title="View Patient Details" onclick='viewAppointmentDetails(${JSON.stringify(appt).replace(/'/g, "&#39;")})'>👁️ View</button>
                            <select class="status-select" onchange="updateAppointmentStatus(${appt.id}, this.value)" style="margin-right:0; margin-top:5px; width:100%;">
                                <option value="" disabled selected>Update Status</option>
                                <option value="pending" ${appt.status === 'pending' ? 'disabled' : ''}>⏳ Set Pending</option>
                                <option value="confirmed" ${appt.status === 'confirmed' ? 'disabled' : ''}>✅ Confirm</option>
                                <option value="completed" ${appt.status === 'completed' ? 'disabled' : ''}>🏥 Mark Completed</option>
                                <option value="cancelled" ${appt.status === 'cancelled' ? 'disabled' : ''}>❌ Cancel</option>
                            </select>
                        </div>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error("Error loading appointments:", error);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--danger)">Failed to load appointments</td></tr>';
    }
}

async function updateAppointmentStatus(id, newStatus) {
    const hospitalName = localStorage.getItem('hospitalName');
    if (!confirm(`Are you sure you want to change this appointment's status to ${newStatus}?`)) {
        loadAppointments(); // Reset select dropdown
        return;
    }

    try {
        const response = await fetch(`/hospital/appointments/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus, hospitalName: hospitalName })
        });
        
        const data = await response.json();
        if (data.success) {
            loadAppointments();
        } else {
            alert("Error: " + data.message);
            loadAppointments();
        }
    } catch (error) {
        console.error("Error updating appointment:", error);
        alert("Failed to connect to server");
        loadAppointments();
    }
}

// ==================== APPOINTMENT DETAILS MODAL ====================

function viewAppointmentDetails(appt) {
    const content = `
        <div style="margin-bottom: 10px;"><strong>Appointment ID:</strong> #APT-${String(appt.id).padStart(4, '0')}</div>
        <div style="margin-bottom: 10px;"><strong>Patient Name:</strong> ${escapeHtml(appt.patient_name)}</div>
        <div style="margin-bottom: 10px;"><strong>Phone:</strong> ${escapeHtml(appt.phone || 'N/A')}</div>
        <div style="margin-bottom: 10px;"><strong>Email:</strong> ${escapeHtml(appt.email || 'N/A')}</div>
        <div style="margin-bottom: 10px;"><strong>Doctor:</strong> ${escapeHtml(appt.doctor_name)} (${escapeHtml(appt.specialization)})</div>
        <div style="margin-bottom: 10px;"><strong>Date:</strong> ${formatDate(appt.appointment_date)} at ${appt.appointment_time}</div>
        <div style="margin-bottom: 10px;"><strong>Status:</strong> <span class="status-badge status-${appt.status}">${appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}</span></div>
        <div style="margin-top: 15px; padding: 10px; background: rgba(0,0,0,0.05); border-radius: 5px;">
            <strong>Reason for Visit / Message:</strong><br>
            ${escapeHtml(appt.reason || 'No specific reason provided.')}
        </div>
    `;
    
    document.getElementById('apptDetailsContent').innerHTML = content;
    document.getElementById('apptDetailsModal').classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeApptDetails() {
    document.getElementById('apptDetailsModal').classList.remove('show');
    document.body.style.overflow = '';
}

// Close appt modal on overlay click
document.getElementById('apptDetailsModal').addEventListener('click', function (e) {
    if (e.target === this) closeApptDetails();
});

// ==================== HOSPITAL PROFILE & BEDS ====================

async function loadProfile() {
    const hospitalName = localStorage.getItem('hospitalName');
    if (!hospitalName) return;

    try {
        const response = await fetch(`/hospital/profile/${encodeURIComponent(hospitalName)}`);
        const data = await response.json();

        if (data.success && data.profile) {
            document.getElementById('profName').value = data.profile.name || '';
            document.getElementById('profEmail').value = data.profile.email || '';
            document.getElementById('profAddress').value = data.profile.address || '';
            document.getElementById('profPhone').value = data.profile.phone || '';
            document.getElementById('profTotalBeds').value = data.profile.total_beds || 0;
            document.getElementById('profAvailableBeds').value = data.profile.available_beds || 0;
        }
    } catch (error) {
        console.error("Error loading profile:", error);
    }
}

async function saveProfile(event) {
    event.preventDefault();
    const hospitalName = localStorage.getItem('hospitalName');
    
    const address = document.getElementById('profAddress').value.trim();
    const phone = document.getElementById('profPhone').value.trim();
    const total_beds = parseInt(document.getElementById('profTotalBeds').value) || 0;
    const available_beds = parseInt(document.getElementById('profAvailableBeds').value) || 0;

    if (available_beds > total_beds) {
        alert("Available beds cannot exceed total beds.");
        return;
    }

    try {
        const response = await fetch(`/hospital/profile/${encodeURIComponent(hospitalName)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address, phone, total_beds, available_beds })
        });
        const data = await response.json();
        
        if (data.success) {
            alert("Profile updated successfully!");
        } else {
            alert("Error: " + data.message);
        }
    } catch (error) {
        console.error("Error saving profile:", error);
        alert("Failed to connect to server");
    }
}

// Utility functions
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ==================== DOCTOR FORM MODAL ====================

function openDoctorForm() {
    document.getElementById('doctorFormTitle').innerText = '➕ Add Doctor';
    document.getElementById('doctorFormId').value = '';
    
    // Clear fields
    document.getElementById('dfName').value = '';
    document.getElementById('dfSpec').value = '';
    document.getElementById('dfDegree').value = '';
    document.getElementById('dfPhone').value = '';
    document.getElementById('dfEmail').value = '';
    document.getElementById('dfDays').value = 'Mon-Fri';
    document.getElementById('dfTime').value = '9:00 AM - 5:00 PM';

    document.getElementById('doctorFormModal').classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeDoctorForm() {
    document.getElementById('doctorFormModal').classList.remove('show');
    document.body.style.overflow = '';
}

async function saveDoctor() {
    const name = document.getElementById('dfName').value.trim();
    const specialization = document.getElementById('dfSpec').value.trim();
    const hospitalName = localStorage.getItem('hospitalName');

    if (!name || !specialization) {
        alert('Doctor name and specialization are required!');
        return;
    }

    const payload = {
        name,
        specialization,
        degree: document.getElementById('dfDegree').value.trim(),
        hospitalName: hospitalName, // Passed for backend validation
        hospital: hospitalName, // Deprecated usage, handled by hospitalName
        phone: document.getElementById('dfPhone').value.trim(),
        email: document.getElementById('dfEmail').value.trim(),
        available_days: document.getElementById('dfDays').value.trim(),
        available_time: document.getElementById('dfTime').value.trim(),
    };

    const editId = document.getElementById('doctorFormId').value;
    const isEdit = !!editId;

    try {
        const url = isEdit ? `/hospital/doctors/${editId}` : '/hospital/doctors';
        const method = isEdit ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (data.success) {
            closeDoctorForm();
            loadDoctors();
        } else {
            alert(data.message || 'Failed to add doctor');
        }
    } catch (error) {
        alert('Error adding doctor');
    }
}

function editDoctor(doc) {
    document.getElementById('doctorFormTitle').innerText = '✏️ Edit Doctor';
    document.getElementById('doctorFormId').value = doc.id;
    
    document.getElementById('dfName').value = doc.name || '';
    document.getElementById('dfSpec').value = doc.specialization || '';
    document.getElementById('dfDegree').value = doc.degree || '';
    document.getElementById('dfPhone').value = doc.phone || '';
    document.getElementById('dfEmail').value = doc.email || '';
    document.getElementById('dfDays').value = doc.available_days || 'Mon-Fri';
    document.getElementById('dfTime').value = doc.available_time || '9:00 AM - 5:00 PM';

    document.getElementById('doctorFormModal').classList.add('show');
    document.body.style.overflow = 'hidden';
}

async function deleteDoctor(doctorId, doctorName) {
    const hospitalName = localStorage.getItem('hospitalName');
    if (!confirm(`Are you sure you want to delete Dr. ${doctorName}?\nThis action cannot be undone.`)) return;

    try {
        const response = await fetch(`/hospital/doctors/${doctorId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hospitalName })
        });
        const data = await response.json();
        if (data.success) {
            loadDoctors();
        } else {
            alert(data.message || 'Failed to delete doctor');
        }
    } catch (error) {
        alert('Error deleting doctor');
    }
}

// Close doctor form modal on overlay click
document.getElementById('doctorFormModal').addEventListener('click', function (e) {
    if (e.target === this) closeDoctorForm();
});
