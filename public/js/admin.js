        let adminUser = null;
        let allBookings = [];
        let allUsers = [];
        let allDoctors = [];
        let allAppointments = [];
        window.onload = function () {
            const admin = sessionStorage.getItem('adminUser');
            if (admin) {
                adminUser = JSON.parse(admin);
                showDashboard();
            } else {
                showLogin();
            }
        };

        function showLogin() {
            document.getElementById('loginView').style.display = 'flex';
            document.getElementById('dashboardView').style.display = 'none';
        }

        function showDashboard() {
            document.getElementById('loginView').style.display = 'none';
            document.getElementById('dashboardView').style.display = 'block';
            document.getElementById('adminName').textContent = adminUser.name;
            loadData();
            loadUsers();
            loadDoctors();
            loadAppointments();
            loadFleet();
            loadHospitals();
        }

        function showError(message) {
            const errorDiv = document.getElementById('errorMessage');
            const errorText = document.getElementById('errorText');
            errorText.textContent = message;
            errorDiv.classList.add('show');
        }

        function hideError() {
            document.getElementById('errorMessage').classList.remove('show');
        }

        async function handleAdminLogin() {
            hideError();

            const email = document.getElementById('adminEmail').value.trim();
            const password = document.getElementById('adminPassword').value;
            const btn = document.getElementById('loginBtn');

            if (!email || !password) {
                showError('Please enter both email and password');
                return;
            }

            btn.disabled = true;
            btn.classList.add('loading');

            try {
                const response = await fetch('/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (data.success) {
                    adminUser = {
                        id: data.adminId,
                        name: data.adminName,
                        email: email
                    };
                    sessionStorage.setItem('adminUser', JSON.stringify(adminUser));
                    showDashboard();
                } else {
                    showError(data.message || 'Invalid credentials');
                }
            } catch (error) {
                showError('Connection error. Please try again.');
            } finally {
                btn.disabled = false;
                btn.classList.remove('loading');
            }
        }

        function handleLogout() {
            sessionStorage.removeItem('adminUser');
            adminUser = null;
            showLogin();
        }

        async function loadData() {
            await Promise.all([loadStats(), loadBookings()]);
        }

        async function loadStats() {
            try {
                const response = await fetch('/admin/stats');
                const data = await response.json();
                if (data.success) {
                    document.getElementById('totalBookings').textContent = data.stats.total || 0;
                    document.getElementById('pendingBookings').textContent = data.stats.pending || 0;
                    document.getElementById('dispatchedBookings').textContent = data.stats.dispatched || 0;
                    document.getElementById('completedBookings').textContent = data.stats.completed || 0;
                    document.getElementById('tabBookingsCount').textContent = data.stats.total || 0;
                }
            } catch (error) {
                console.error('Error loading stats:', error);
            }
        }

        async function loadBookings() {
            const tbody = document.getElementById('bookingsTable');

            try {
                const response = await fetch('/admin/bookings');
                const data = await response.json();

                if (data.success && data.bookings.length > 0) {
                    allBookings = data.bookings;
                    tbody.innerHTML = data.bookings.map(booking => `
                        <tr onclick="openModal(${booking.id})">
                            <td class="booking-id">#${booking.id}</td>
                            <td>${escapeHtml(booking.patient_name)}</td>
                            <td>${escapeHtml(booking.phone)}</td>
                            <td>${escapeHtml(booking.pickup_location)}</td>
                            <td>${escapeHtml(booking.drop_location)}</td>
                            <td><span class="emergency-type ${booking.emergency_type}">${booking.emergency_type}</span></td>
                            <td><span class="status-badge ${booking.status}">${booking.status}</span></td>
                            <td>${formatDate(booking.created_at)}</td>
                            <td class="action-btns" onclick="event.stopPropagation()">
                                ${getActionButtons(booking)}
                            </td>
                        </tr>
                    `).join('');
                } else {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="9" class="empty-state">
                                <div class="empty-icon">📭</div>
                                <p>No bookings yet</p>
                            </td>
                        </tr>
                    `;
                }
            } catch (error) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="9" class="empty-state">
                            <div class="empty-icon">⚠️</div>
                            <p>Error loading bookings</p>
                        </td>
                    </tr>
                `;
            }
        }

        function getActionButtons(booking) {
            if (booking.status === 'completed' || booking.status === 'cancelled') {
                return '<span style="color: var(--text-muted-dark);">—</span>';
            }

            let buttons = [];

            if (booking.status === 'pending') {
                buttons.push(`<button class="action-btn dispatch" onclick="dispatchAndTrack(${booking.id})">🚑 Dispatch & Track</button>`);
            }

            if (booking.status === 'dispatched') {
                buttons.push(`<a href="/tracking.html?bookingId=${booking.id}" target="_blank" class="action-btn" style="background:linear-gradient(135deg,#00d4ff,#0099cc); color:white; text-decoration:none; display:inline-flex; align-items:center; padding:6px 12px; border-radius:6px; font-size:0.82em; font-weight:600;">🗺️ Track</a>`);
                buttons.push(`<button class="action-btn complete" onclick="updateStatus(${booking.id}, 'completed')">✅ Complete</button>`);
            }

            if (booking.status !== 'cancelled') {
                buttons.push(`<button class="action-btn cancel" onclick="updateStatus(${booking.id}, 'cancelled')">❌ Cancel</button>`);
            }

            return buttons.join('');
        }

        async function updateStatus(bookingId, newStatus) {
            const confirmMsg = `Are you sure you want to mark this booking as "${newStatus}"?`;
            if (!confirm(confirmMsg)) return;

            try {
                const response = await fetch(`/admin/bookings/${bookingId}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus })
                });

                const data = await response.json();
                if (data.success) {
                    loadData();
                } else {
                    alert(data.message || 'Failed to update status');
                }
            } catch (error) {
                alert('Error updating status');
            }
        }

        // Dispatch ambulance AND start live tracking
        async function dispatchAndTrack(bookingId) {
            if (!confirm('Dispatch ambulance and start live tracking?')) return;

            try {
                // Start tracking (this also sets status to dispatched)
                const trackRes = await fetch(`/tracking/start/${bookingId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                const trackData = await trackRes.json();

                if (trackData.success) {
                    alert('🚑 Ambulance dispatched! Live tracking started.');
                    loadData();
                    // Open tracking page in new tab
                    window.open(`/tracking.html?bookingId=${bookingId}`, '_blank');
                } else {
                    alert(trackData.message || 'Failed to start tracking');
                }
            } catch (error) {
                console.error('Dispatch error:', error);
                alert('Error dispatching ambulance. Please try again.');
            }
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function formatDate(dateStr) {
            const date = new Date(dateStr);
            return date.toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        function formatDateFull(dateStr) {
            const date = new Date(dateStr);
            return date.toLocaleString('en-IN', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }

        // ==================== MODAL FUNCTIONS ====================
        function openModal(bookingId) {
            const booking = allBookings.find(b => b.id === bookingId);
            if (!booking) return;

            document.getElementById('modalBookingId').textContent = `#${booking.id}`;
            document.getElementById('modalPatient').textContent = booking.patient_name;
            document.getElementById('modalPhone').textContent = booking.phone;
            document.getElementById('modalPickup').textContent = booking.pickup_location;
            document.getElementById('modalDrop').textContent = booking.drop_location;

            // Show doctor info if available (for appointments)
            if (booking.doctor_name) {
                const docInfo = `🩺 ${booking.doctor_name} <span style="font-size:0.9em; opacity:0.8;">(${booking.doctor_degree || ''})</span>`;
            }
            document.getElementById('modalEmergency').innerHTML = `<span class="emergency-type ${booking.emergency_type}">${booking.emergency_type}</span>`;
            document.getElementById('modalStatus').innerHTML = `<span class="status-badge ${booking.status}">${booking.status}</span>`;
            document.getElementById('modalTime').textContent = formatDateFull(booking.created_at);
            document.getElementById('modalNotes').textContent = booking.notes || '';

            // Build footer action buttons
            const footer = document.getElementById('modalFooter');
            if (booking.status === 'completed' || booking.status === 'cancelled') {
                footer.innerHTML = '';
            } else {
                let btns = '';
                if (booking.status === 'pending') {
                    btns += `<button class="action-btn dispatch" onclick="updateStatus(${booking.id}, 'dispatched'); closeModal();">🚑 Dispatch</button>`;
                }
                if (booking.status === 'dispatched') {
                    btns += `<button class="action-btn complete" onclick="updateStatus(${booking.id}, 'completed'); closeModal();">✅ Complete</button>`;
                }
                if (booking.status !== 'cancelled') {
                    btns += `<button class="action-btn cancel" onclick="updateStatus(${booking.id}, 'cancelled'); closeModal();">❌ Cancel</button>`;
                }
                footer.innerHTML = btns;
            }

            document.getElementById('bookingModal').classList.add('show');
            document.body.style.overflow = 'hidden';
        }

        function closeModal() {
            document.getElementById('bookingModal').classList.remove('show');
            document.body.style.overflow = '';
        }

        // Close modal on overlay click
        document.getElementById('bookingModal').addEventListener('click', function (e) {
            if (e.target === this) closeModal();
        });

        // Close modal on Escape key
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                closeModal();
                closeUserModal();
                closeDoctorForm();
            }
        });

        // ==================== TAB SWITCHING ====================
        function switchTab(tab) {
            document.getElementById('tabBookings').classList.toggle('active', tab === 'bookings');
            document.getElementById('tabUsers').classList.toggle('active', tab === 'users');
            document.getElementById('tabDoctors').classList.toggle('active', tab === 'doctors');
            document.getElementById('tabAppointments').classList.toggle('active', tab === 'appointments');
            document.getElementById('tabFleet').classList.toggle('active', tab === 'fleet');
            document.getElementById('tabHospitals').classList.toggle('active', tab === 'hospitals');
            
            document.getElementById('bookingsView').classList.toggle('active', tab === 'bookings');
            document.getElementById('usersView').classList.toggle('active', tab === 'users');
            document.getElementById('doctorsView').classList.toggle('active', tab === 'doctors');
            document.getElementById('appointmentsView').classList.toggle('active', tab === 'appointments');
            document.getElementById('fleetView').classList.toggle('active', tab === 'fleet');
            document.getElementById('hospitalsView').classList.toggle('active', tab === 'hospitals');

            if (tab === 'fleet') {
                loadFleet();
            }

            if (tab === 'users' && allUsers.length === 0) {
                loadUsers();
            }
            if (tab === 'doctors' && allDoctors.length === 0) {
                loadDoctors();
            }
            if (tab === 'appointments' && allAppointments.length === 0) {
                loadAppointments();
            }
        }

        // ==================== USER MANAGEMENT ====================
        function getAvatarClass(name) {
            const classes = ['a', 'b', 'c', 'd', 'e'];
            const idx = (name || '').charCodeAt(0) % classes.length;
            return classes[idx];
        }

        function getInitials(name) {
            if (!name) return '?';
            const parts = name.trim().split(/\s+/);
            if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
            return parts[0][0].toUpperCase();
        }

        async function loadUsers() {
            const tbody = document.getElementById('usersTable');
            try {
                const response = await fetch('/admin/users');
                const data = await response.json();

                if (data.success && data.users.length > 0) {
                    allUsers = data.users;
                    document.getElementById('tabUsersCount').textContent = data.users.length;

                    tbody.innerHTML = data.users.map(user => `
                        <tr onclick="openUserModal(${user.id})">
                            <td class="booking-id">#${user.id}</td>
                            <td>
                                <div class="user-name-cell">
                                    <span class="user-avatar ${getAvatarClass(user.name)}">${getInitials(user.name)}</span>
                                    ${escapeHtml(user.name)}
                                </div>
                            </td>
                            <td class="user-email">${escapeHtml(user.email)}</td>
                            <td><span class="booking-count ${user.total_bookings === 0 ? 'zero' : ''}">${user.total_bookings}</span></td>
                            <td>${user.last_booking ? formatDate(user.last_booking) : '<span style="color: var(--text-muted-dark);">No activity</span>'}</td>
                        </tr>
                    `).join('');
                } else {
                    allUsers = [];
                    document.getElementById('tabUsersCount').textContent = '0';
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="5" class="empty-state">
                                <div class="empty-icon">👥</div>
                                <p>No registered users yet</p>
                            </td>
                        </tr>
                    `;
                }
            } catch (error) {
                console.error('Error loading users:', error);
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="empty-state">
                            <div class="empty-icon">⚠️</div>
                            <p>Error loading users</p>
                        </td>
                    </tr>
                `;
            }
        }

        // ==================== USER DETAIL MODAL ====================
        async function openUserModal(userId) {
            const user = allUsers.find(u => u.id === userId);
            if (!user) return;

            const avatarClass = getAvatarClass(user.name);
            const avatar = document.getElementById('userModalAvatar');
            avatar.textContent = getInitials(user.name);
            avatar.className = 'user-detail-avatar user-avatar ' + avatarClass;

            document.getElementById('userModalName').textContent = user.name;
            document.getElementById('userModalEmail').textContent = user.email;
            document.getElementById('userModalId').textContent = '#' + user.id;
            document.getElementById('userModalBookings').textContent = user.total_bookings;

            const listEl = document.getElementById('userBookingsList');
            listEl.innerHTML = '<div class="loading-text">Loading bookings</div>';

            document.getElementById('userModal').classList.add('show');
            document.body.style.overflow = 'hidden';

            // Fetch user's booking history
            try {
                const response = await fetch(`/admin/users/${userId}/bookings`);
                const data = await response.json();

                if (data.success && data.bookings.length > 0) {
                    listEl.innerHTML = data.bookings.map(b => `
                        <div class="user-booking-item">
                            <div class="ub-left">
                                <span class="ub-id">#${b.id} — ${escapeHtml(b.patient_name)}</span>
                                <span class="ub-route">${escapeHtml(b.pickup_location)} → ${escapeHtml(b.drop_location)}</span>
                            </div>
                            <div class="ub-right">
                                <span class="status-badge ${b.status}">${b.status}</span>
                                <span class="ub-date">${formatDate(b.created_at)}</span>
                            </div>
                        </div>
                    `).join('');
                } else {
                    listEl.innerHTML = '<div class="no-bookings-msg">📭 No bookings found for this user</div>';
                }
            } catch (error) {
                listEl.innerHTML = '<div class="no-bookings-msg">⚠️ Error loading bookings</div>';
            }
        }

        function closeUserModal() {
            document.getElementById('userModal').classList.remove('show');
            document.body.style.overflow = '';
        }

        // Close user modal on overlay click
        document.getElementById('userModal').addEventListener('click', function (e) {
            if (e.target === this) closeUserModal();
        });

        // ==================== DOCTOR MANAGEMENT ====================
        function renderStars(rating) {
            const r = parseFloat(rating) || 0;
            const full = Math.floor(r);
            const half = r % 1 >= 0.3 ? 1 : 0;
            let stars = '★'.repeat(full);
            if (half) stars += '½';
            return `<span class="rating-stars">${stars}<span class="rating-value">${r.toFixed(1)}</span></span>`;
        }

        async function loadDoctors() {
            const tbody = document.getElementById('doctorsTable');
            try {
                const response = await fetch('/admin/doctors');
                const data = await response.json();

                if (data.success && data.doctors.length > 0) {
                    allDoctors = data.doctors;
                    document.getElementById('tabDoctorsCount').textContent = data.doctors.length;

                    tbody.innerHTML = data.doctors.map(doc => `
                        <tr>
                            <td class="booking-id">#${doc.id}</td>
                            <td>
                                <div class="doctor-name-cell">
                                    <div class="doctor-icon">🩺</div>
                                    <div>
                                        <div>${escapeHtml(doc.name)} <span style="font-size:0.85em; color:var(--text-muted-dark); font-weight:normal;">(${escapeHtml(doc.degree || '')})</span></div>
                                        <div class="doctor-spec">${escapeHtml(doc.specialization)}</div>
                                    </div>
                                </div>
                            </td>
                            <td>${doc.hospital ? escapeHtml(doc.hospital) : '<span style="color:var(--text-muted-dark)">—</span>'}</td>
                            <td>
                                ${doc.phone ? '<div>' + escapeHtml(doc.phone) + '</div>' : ''}
                                ${doc.email ? '<div class="user-email">' + escapeHtml(doc.email) + '</div>' : ''}
                            </td>
                            <td>
                                <span class="avail-badge">${escapeHtml(doc.available_days || 'Mon-Fri')}</span>
                                <div style="font-size:0.8em; color:var(--text-muted-dark); margin-top:4px;">${escapeHtml(doc.available_time || '9-5')}</div>
                            </td>
                            <td>
                                <div style="display:flex; gap:6px;">
                                    <button class="edit-btn-small" onclick="openDoctorForm(${doc.id})">✏️ Edit</button>
                                    <button class="delete-btn-small" onclick="deleteDoctor(${doc.id}, '${escapeHtml(doc.name).replace(/'/g, "\\'")}')">🗑️</button>
                                </div>
                            </td>
                        </tr>
                    `).join('');
                } else {
                    allDoctors = [];
                    document.getElementById('tabDoctorsCount').textContent = '0';
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="6" class="empty-state">
                                <div class="empty-icon">🩺</div>
                                <p>No doctors found. Add one!</p>
                            </td>
                        </tr>
                    `;
                }
            } catch (error) {
                console.error('Error loading doctors:', error);
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="empty-state">
                            <div class="empty-icon">⚠️</div>
                            <p>Error loading doctors</p>
                        </td>
                    </tr>
                `;
            }
        }

        function openDoctorForm(doctorId) {
            if (doctorId) {
                // Edit mode
                const doc = allDoctors.find(d => d.id === doctorId);
                if (!doc) return;
                document.getElementById('doctorFormTitle').textContent = '✏️ Edit Doctor';
                document.getElementById('doctorFormId').value = doc.id;
                document.getElementById('dfName').value = doc.name || '';
                document.getElementById('dfSpec').value = doc.specialization || '';
                document.getElementById('dfDegree').value = doc.degree || '';
                document.getElementById('dfHospital').value = doc.hospital || '';
                document.getElementById('dfPhone').value = doc.phone || '';
                document.getElementById('dfEmail').value = doc.email || '';
                document.getElementById('dfDays').value = doc.available_days || 'Mon-Fri';
                document.getElementById('dfTime').value = doc.available_time || '9:00 AM - 5:00 PM';
            } else {
                // Add mode
                document.getElementById('doctorFormTitle').textContent = '➕ Add Doctor';
                document.getElementById('doctorFormId').value = '';
                document.getElementById('dfName').value = '';
                document.getElementById('dfSpec').value = '';
                document.getElementById('dfDegree').value = '';
                document.getElementById('dfHospital').value = '';
                document.getElementById('dfPhone').value = '';
                document.getElementById('dfEmail').value = '';
                document.getElementById('dfDays').value = 'Mon-Fri';
                document.getElementById('dfTime').value = '9:00 AM - 5:00 PM';
            }

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

            if (!name || !specialization) {
                alert('Doctor name and specialization are required!');
                return;
            }

            const payload = {
                name,
                specialization,
                degree: document.getElementById('dfDegree').value.trim(),
                hospital: document.getElementById('dfHospital').value.trim(),
                phone: document.getElementById('dfPhone').value.trim(),
                email: document.getElementById('dfEmail').value.trim(),
                available_days: document.getElementById('dfDays').value.trim(),
                available_time: document.getElementById('dfTime').value.trim(),
            };

            const editId = document.getElementById('doctorFormId').value;
            const isEdit = !!editId;

            try {
                const url = isEdit ? `/admin/doctors/${editId}` : '/admin/doctors';
                const method = isEdit ? 'PUT' : 'POST';

                const response = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();
                if (data.success) {
                    closeDoctorForm();
                    loadDoctors();
                } else {
                    alert(data.message || 'Failed to save doctor');
                }
            } catch (error) {
                alert('Error saving doctor');
            }
        }

        async function deleteDoctor(doctorId, doctorName) {
            if (!confirm(`Delete Doctor "${doctorName}"? This action cannot be undone.`)) return;

            try {
                const response = await fetch(`/admin/doctors/${doctorId}`, { method: 'DELETE' });
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

        // ==================== APPOINTMENT MANAGEMENT ====================
        async function loadAppointments() {
            const tbody = document.getElementById('appointmentsTable');
            try {
                // Load stats and appointments in parallel
                const [statsRes, apptRes] = await Promise.all([
                    fetch('/admin/appointment-stats'),
                    fetch('/admin/appointments')
                ]);
                const statsData = await statsRes.json();
                const apptData = await apptRes.json();

                // Update stats cards
                if (statsData.success) {
                    document.getElementById('apptTotalCount').textContent = statsData.stats.total || 0;
                    document.getElementById('apptPendingCount').textContent = statsData.stats.pending || 0;
                    document.getElementById('apptConfirmedCount').textContent = statsData.stats.confirmed || 0;
                    document.getElementById('apptCompletedCount').textContent = statsData.stats.completed || 0;
                    document.getElementById('tabAppointmentsCount').textContent = statsData.stats.total || 0;
                }

                if (apptData.success && apptData.appointments.length > 0) {
                    allAppointments = apptData.appointments;
                    tbody.innerHTML = apptData.appointments.map(appt => `
                        <tr>
                            <td class="booking-id">#${appt.id}</td>
                            <td>
                                <div>${escapeHtml(appt.patient_name)}</div>
                                <div style="font-size:0.8em; color:var(--text-muted-dark)">${escapeHtml(appt.email || '')}</div>
                            </td>
                            <td>
                                <div>${escapeHtml(appt.doctor_name)} <span style="font-size:0.85em; color:var(--text-muted-dark)">(${escapeHtml(appt.doctor_degree || '')})</span></div>
                                <div style="font-size:0.8em; color:var(--text-muted-dark)">${escapeHtml(appt.specialization || '')}</div>
                            </td>
                            <td>
                                <div>${formatDate(appt.appointment_date)}</div>
                                <div style="font-size:0.85em; color:var(--text-muted-dark)">${escapeHtml(appt.appointment_time)}</div>
                            </td>
                            <td>${escapeHtml(appt.phone || '-')}</td>
                            <td><span class="appt-status ${appt.status}">${appt.status}</span></td>
                            <td class="action-btns">${getApptActions(appt)}</td>
                        </tr>
                    `).join('');
                } else {
                    allAppointments = [];
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="7" class="empty-state">
                                <div class="empty-icon">📅</div>
                                <p>No appointments yet</p>
                            </td>
                        </tr>
                    `;
                }
            } catch (error) {
                console.error('Error loading appointments:', error);
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="empty-state">
                            <div class="empty-icon">⚠️</div>
                            <p>Error loading appointments</p>
                        </td>
                    </tr>
                `;
            }
        }

        function getApptActions(appt) {
            if (appt.status === 'completed' || appt.status === 'cancelled') {
                return '<span style="color: var(--text-muted-dark);">—</span>';
            }
            let btns = [];
            if (appt.status === 'pending') {
                btns.push(`<button class="action-btn dispatch" onclick="updateApptStatus(${appt.id}, 'confirmed')">✅ Confirm</button>`);
            }
            if (appt.status === 'confirmed') {
                btns.push(`<button class="action-btn complete" onclick="updateApptStatus(${appt.id}, 'completed')">✔️ Complete</button>`);
            }
            btns.push(`<button class="action-btn cancel" onclick="updateApptStatus(${appt.id}, 'cancelled')">❌ Cancel</button>`);
            return btns.join('');
        }

        async function updateApptStatus(apptId, newStatus) {
            if (!confirm(`Mark this appointment as "${newStatus}"?`)) return;
            try {
                const response = await fetch(`/admin/appointments/${apptId}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus })
                });
                const data = await response.json();
                if (data.success) {
                    loadAppointments();
                } else {
                    alert(data.message || 'Failed to update status');
                }
            } catch (error) {
                alert('Error updating appointment status');
            }
        }

        // ============================================
        // FLEET MANAGEMENT
        // ============================================
        
        async function loadFleet() {
            const tbody = document.getElementById('fleetTable');
            try {
                const res = await fetch('/admin/fleet/drivers');
                const data = await res.json();
                if(data.success && data.drivers.length > 0) {
                    document.getElementById('tabFleetCount').textContent = data.drivers.length;
                    tbody.innerHTML = data.drivers.map(d => `
                        <tr>
                            <td class="booking-id">#${d.id}</td>
                            <td><strong>${escapeHtml(d.name)}</strong></td>
                            <td><span class="status-badge ${d.status}">${d.status}</span></td>
                            <td>⭐ ${(d.rating || 5).toFixed(1)}</td>
                            <td style="color:#27ae60; font-weight:600;">₹${d.total_earnings || 0}</td>
                            <td>${d.total_trips || 0}</td>
                            <td>${d.vehicle_id ? `🚑 ${d.vehicle_id}` : '<span style="color:#999">Unassigned</span>'}</td>
                        </tr>
                    `).join('');
                } else {
                    document.getElementById('tabFleetCount').textContent = '0';
                    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No drivers found</td></tr>';
                }
            } catch (e) {
                tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Error loading fleet</td></tr>';
            }
        }

        document.addEventListener('keypress', function (e) {
            if (e.key === 'Enter' && document.getElementById('loginView').style.display !== 'none') {
                handleAdminLogin();
            }
        });

        async function loadHospitals() {
            const tbody = document.getElementById('hospitalsTableBody');
            try {
                const res = await fetch('/admin/hospitals');
                const data = await res.json();
                if (data.success && data.hospitals.length > 0) {
                    document.getElementById('tabHospitalsCount').textContent = data.hospitals.length;
                    tbody.innerHTML = data.hospitals.map(h => `
                        <tr>
                            <td><strong>${escapeHtml(h.name)}</strong></td>
                            <td>${escapeHtml(h.email)}</td>
                            <td>${escapeHtml(h.phone)}</td>
                            <td>
                                <span style="color:#27ae60; font-weight:bold;">${h.available_beds}</span> / 
                                <span style="color:#7f8c8d;">${h.total_beds}</span>
                            </td>
                            <td>${new Date(h.created_at).toLocaleDateString()}</td>
                            <td>
                                <button class="btn-action delete" onclick="deleteHospital(${h.id}, '${escapeHtml(h.name)}')">Delete</button>
                            </td>
                        </tr>
                    `).join('');
                } else {
                    document.getElementById('tabHospitalsCount').textContent = '0';
                    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No hospitals found</td></tr>';
                }
            } catch (e) {
                tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Error loading hospitals</td></tr>';
            }
        }

        async function deleteHospital(id, name) {
            if (!confirm(`Are you sure you want to delete hospital: ${name}?`)) return;
            try {
                const res = await fetch(`/admin/hospitals/${id}`, { method: 'DELETE' });
                const data = await res.json();
                if (data.success) {
                    loadHospitals();
                } else {
                    alert(data.message || 'Failed to delete hospital');
                }
            } catch (e) {
                alert('Error deleting hospital');
            }
        }
