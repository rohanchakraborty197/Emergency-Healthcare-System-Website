// ✅ User session state
let currentUser = null;

// ✅ Check login status on page load
window.onload = function () {
    const savedUser = sessionStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateAuthUI();
    }
    loadFrontendDoctors();
}

// ✅ Update UI based on login status
function updateAuthUI() {
    const authSection = document.getElementById('authSection');
    if (currentUser) {
        const historyLabel = currentUser.role === 'doctor' ? '👨‍⚕️ My Patients' : '📋 My Bookings';
        const notifHtml = currentUser.role === 'doctor' ? '' : `
                <div class="notif-bell-wrap" onclick="toggleNotifPanel()">
                    <span class="notif-bell">🔔</span>
                    <span class="notif-badge" id="notifBadge" style="display:none;">0</span>
                </div>`;

        authSection.innerHTML = `
            <div class="user-info">
                <button class="my-bookings-btn" onclick="openHistoryModal()">${historyLabel}</button>
                ${notifHtml}
                <span class="user-name">👤 ${currentUser.name}</span>
                <button class="logout-btn" onclick="handleLogout()">Logout</button>
            </div>
        `;
        loadNotifications();
        connectNotificationSocket();
    } else {
        authSection.innerHTML = '<button class="login-btn" onclick="openModal()">Login</button>';
    }
}

// ✅ Handle logout
function handleLogout() {
    currentUser = null;
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('doctorUser');
    updateAuthUI();
    loadFrontendDoctors();
    alert('Logged out successfully!');
}

// ✅ Toggle mobile menu
function toggleMobileMenu() {
    document.querySelector('.hamburger').classList.toggle('active');
    document.querySelector('.nav-links').classList.toggle('active');
}

// ✅ Close mobile menu
function closeMobileMenu() {
    document.querySelector('.hamburger').classList.remove('active');
    document.querySelector('.nav-links').classList.remove('active');
}

// ✅ Open modal
function openModal() {
    document.getElementById("loginModal").style.display = "block";
}

// ✅ Close modal
function closeModal() {
    document.getElementById("loginModal").style.display = "none";
    // Clear all messages
    document.querySelectorAll('.login-msg').forEach(el => { el.className = 'login-msg'; el.innerHTML = ''; });

    // Reset OTP section if it was visible
    const otpSection = document.getElementById('otpVerifySection');
    if (otpSection && otpSection.style.display !== 'none') {
        otpSection.style.display = 'none';
        document.querySelector('.role-tabs').style.display = 'flex';
        document.getElementById('userLoginFields').style.display = 'block';
        document.getElementById('userSignupFields').style.display = 'none';
        document.getElementById('userFormTitle').textContent = 'Welcome Back';
        document.getElementById('userFormSubtitle').textContent = 'Login to your account';
        if (otpCountdownTimer) clearInterval(otpCountdownTimer);
    }
}

// ✅ Switch role tabs (User / Admin / Doctor / Driver)
function switchRoleTab(role, btn) {
    // Update tab indicator position + color
    const indicator = document.getElementById('tabIndicator');
    indicator.className = 'role-tab-indicator ' + role;
    const roles = ['user', 'admin', 'doctor', 'driver', 'hospital'];
    const idx = roles.indexOf(role);
    indicator.style.left = `calc(${idx * 20}% + 4px)`;

    // Update tab active states
    document.querySelectorAll('.role-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');

    // Show correct form
    document.querySelectorAll('.role-form').forEach(f => f.classList.remove('active'));
    document.getElementById(role + 'Form').classList.add('active');

    // Clear messages
    document.querySelectorAll('.login-msg').forEach(el => { el.className = 'login-msg'; el.innerHTML = ''; });
}

// ✅ Toggle between User Login & Signup
function toggleUserSignup(showSignup) {
    const loginFields = document.getElementById('userLoginFields');
    const signupFields = document.getElementById('userSignupFields');
    const title = document.getElementById('userFormTitle');
    const subtitle = document.getElementById('userFormSubtitle');
    const msg = document.getElementById('userLoginMsg');
    msg.className = 'login-msg'; msg.innerHTML = '';

    if (showSignup) {
        loginFields.style.display = 'none';
        signupFields.style.display = 'block';
        title.textContent = 'Create Account';
        subtitle.textContent = 'Join TrackNHeal today';
    } else {
        loginFields.style.display = 'block';
        signupFields.style.display = 'none';
        title.textContent = 'Welcome Back';
        subtitle.textContent = 'Login to your account';
    }
}

// ✅ Toggle between Doctor Login & Signup
function toggleDoctorSignup(showSignup) {
    const loginFields = document.getElementById('doctorLoginFields');
    const signupFields = document.getElementById('doctorSignupFields');
    const title = document.getElementById('doctorFormTitle');
    const subtitle = document.getElementById('doctorFormSubtitle');
    const msg = document.getElementById('doctorLoginMsg');
    msg.className = 'login-msg'; msg.innerHTML = '';

    if (showSignup) {
        loginFields.style.display = 'none';
        signupFields.style.display = 'block';
        title.textContent = 'Doctor Registration';
        subtitle.textContent = 'Join the provider network';
    } else {
        loginFields.style.display = 'block';
        signupFields.style.display = 'none';
        title.textContent = 'Doctor Portal';
        subtitle.textContent = 'View your appointments & patients';
    }
}

// ✅ Toggle between Driver Login & Signup
function toggleDriverSignup(showSignup) {
    const loginFields = document.getElementById('driverLoginFields');
    const signupFields = document.getElementById('driverSignupFields');
    const title = document.getElementById('driverFormTitle');
    const subtitle = document.getElementById('driverFormSubtitle');
    const msg = document.getElementById('driverLoginMsg');
    msg.className = 'login-msg'; msg.innerHTML = '';

    if (showSignup) {
        loginFields.style.display = 'none';
        signupFields.style.display = 'block';
        title.textContent = 'Driver Registration';
        subtitle.textContent = 'Join the TrackNHeal driver network';
    } else {
        loginFields.style.display = 'block';
        signupFields.style.display = 'none';
        title.textContent = 'Driver Portal';
        subtitle.textContent = 'Access your ambulance dashboard';
    }
}

// ✅ Show login message helper
function showLoginMsg(elementId, message, type) {
    const el = document.getElementById(elementId);
    el.innerHTML = message;
    el.className = 'login-msg ' + type;
}

/* ✅ OTP STATE */
let otpEmail = '';      // Email the OTP was sent to
let otpContext = '';    // 'login' or 'signup'
let otpCountdownTimer = null;

/* ✅ USER SIGNUP → POST → backend (now triggers OTP) */
function handleSignup() {
    const name = document.getElementById("signupName").value;
    const email = document.getElementById("signupEmail").value;
    const password = document.getElementById("signupPassword").value;

    if (!name || !email || !password) {
        showLoginMsg('userLoginMsg', '⚠️ Please fill in all fields', 'error');
        return;
    }

    // Disable button while sending
    const btn = document.querySelector('#userSignupFields .submit-btn');
    btn.textContent = 'Sending OTP...';
    btn.disabled = true;

    fetch("/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
    })
        .then(r => r.json())
        .then(data => {
            btn.textContent = 'Create Account';
            btn.disabled = false;
            if (data.otpRequired) {
                // Show OTP verification UI
                otpEmail = email;
                otpContext = 'signup';
                showOTPSection(email);
            } else {
                showLoginMsg('userLoginMsg', '❌ ' + data.message, 'error');
            }
        })
        .catch(() => {
            btn.textContent = 'Create Account';
            btn.disabled = false;
            showLoginMsg('userLoginMsg', '❌ Network error. Please try again.', 'error');
        });
}

/* ✅ USER LOGIN → POST → backend (direct login — no OTP) */
function handleLogin() {
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    if (!email || !password) {
        showLoginMsg('userLoginMsg', '⚠️ Please fill in all fields', 'error');
        return;
    }

    // Disable button while sending
    const btn = document.querySelector('#userLoginFields .submit-btn');
    btn.textContent = 'Logging in...';
    btn.disabled = true;

    fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    })
        .then(r => r.json())
        .then(data => {
            btn.textContent = 'Login';
            btn.disabled = false;
            if (data.success) {
                // Set user session directly
                currentUser = { id: data.userId, name: data.userName, email: email };
                sessionStorage.setItem('currentUser', JSON.stringify(currentUser));

                showLoginMsg('userLoginMsg', '✅ ' + data.message, 'success');

                // Brief success animation then close
                setTimeout(() => {
                    updateAuthUI();
                    closeModal();
                    alert('✅ Login successful! Welcome back.');
                }, 800);
            } else {
                showLoginMsg('userLoginMsg', '❌ ' + data.message, 'error');
            }
        })
        .catch(() => {
            btn.textContent = 'Login';
            btn.disabled = false;
            showLoginMsg('userLoginMsg', '❌ Network error. Please try again.', 'error');
        });
}

/* ✅ Show the OTP verification section */
function showOTPSection(email) {
    // Hide login/signup fields and role tabs
    document.getElementById('userLoginFields').style.display = 'none';
    document.getElementById('userSignupFields').style.display = 'none';
    document.querySelector('.role-tabs').style.display = 'none';
    document.getElementById('userLoginMsg').className = 'login-msg';
    document.getElementById('userLoginMsg').innerHTML = '';

    // Update header
    document.getElementById('userFormTitle').textContent = 'Verify Your Email';
    document.getElementById('userFormSubtitle').textContent = '';

    // Show OTP section
    const otpSection = document.getElementById('otpVerifySection');
    otpSection.style.display = 'block';

    // Mask the email display: r***n@gmail.com
    const [localPart, domain] = email.split('@');
    const masked = localPart.length > 2
        ? localPart[0] + '•••' + localPart[localPart.length - 1] + '@' + domain
        : localPart + '@' + domain;
    document.getElementById('otpEmailDisplay').textContent = masked;

    // Clear OTP inputs
    document.querySelectorAll('.otp-digit').forEach(inp => { inp.value = ''; });
    document.getElementById('otpMsg').className = 'login-msg';
    document.getElementById('otpMsg').innerHTML = '';

    // Focus first digit
    setTimeout(() => document.querySelector('.otp-digit[data-index="0"]').focus(), 100);

    // Start resend countdown
    startResendCountdown();
}

/* ✅ Hide OTP section and go back */
function hideOTPSection() {
    document.getElementById('otpVerifySection').style.display = 'none';
    document.querySelector('.role-tabs').style.display = 'flex';

    if (otpContext === 'signup') {
        document.getElementById('userSignupFields').style.display = 'block';
        document.getElementById('userFormTitle').textContent = 'Create Account';
        document.getElementById('userFormSubtitle').textContent = 'Join TrackNHeal today';
    } else {
        document.getElementById('userLoginFields').style.display = 'block';
        document.getElementById('userFormTitle').textContent = 'Welcome Back';
        document.getElementById('userFormSubtitle').textContent = 'Login to your account';
    }

    // Clear countdown
    if (otpCountdownTimer) clearInterval(otpCountdownTimer);
}

/* ✅ Verify the entered OTP */
function handleVerifyOTP() {
    const digits = document.querySelectorAll('.otp-digit');
    let otp = '';
    digits.forEach(d => otp += d.value);

    if (otp.length !== 6) {
        showLoginMsg('otpMsg', '⚠️ Please enter all 6 digits', 'error');
        return;
    }

    const btn = document.getElementById('otpVerifyBtn');
    btn.textContent = 'Verifying...';
    btn.disabled = true;

    fetch("/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmail, otp })
    })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                showLoginMsg('otpMsg', '✅ ' + data.message, 'success');

                // Set user session
                currentUser = { id: data.userId, name: data.userName, email: otpEmail };
                sessionStorage.setItem('currentUser', JSON.stringify(currentUser));

                // Brief success animation then close
                setTimeout(() => {
                    updateAuthUI();
                    closeModal();
                    // Reset OTP section state
                    document.getElementById('otpVerifySection').style.display = 'none';
                    document.querySelector('.role-tabs').style.display = 'flex';
                    btn.textContent = '🔐 Verify OTP';
                    btn.disabled = false;

                    if (data.context === 'signup') {
                        alert('🎉 Account created! Welcome to TrackNHeal.');
                    } else {
                        alert('✅ Login successful! Welcome back.');
                    }
                }, 800);
            } else {
                btn.textContent = '🔐 Verify OTP';
                btn.disabled = false;
                showLoginMsg('otpMsg', '❌ ' + data.message, 'error');
                // Shake the OTP inputs
                document.querySelector('.otp-input-group').classList.add('otp-shake');
                setTimeout(() => document.querySelector('.otp-input-group').classList.remove('otp-shake'), 600);
            }
        })
        .catch(() => {
            btn.textContent = '🔐 Verify OTP';
            btn.disabled = false;
            showLoginMsg('otpMsg', '❌ Network error. Please try again.', 'error');
        });
}

/* ✅ Resend OTP */
function handleResendOTP() {
    const resendLink = document.getElementById('otpResendLink');
    resendLink.textContent = 'Sending...';
    resendLink.style.pointerEvents = 'none';

    fetch("/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmail })
    })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                showLoginMsg('otpMsg', '✅ New OTP sent!', 'success');
                // Clear old OTP inputs
                document.querySelectorAll('.otp-digit').forEach(inp => { inp.value = ''; });
                document.querySelector('.otp-digit[data-index="0"]').focus();
                // Restart countdown
                startResendCountdown();
            } else {
                showLoginMsg('otpMsg', '❌ ' + data.message, 'error');
                resendLink.textContent = '📩 Resend Code';
                resendLink.style.pointerEvents = 'auto';
            }
        })
        .catch(() => {
            showLoginMsg('otpMsg', '❌ Network error.', 'error');
            resendLink.textContent = '📩 Resend Code';
            resendLink.style.pointerEvents = 'auto';
        });
}

/* ✅ Resend countdown timer (30 seconds) */
function startResendCountdown() {
    const timerEl = document.getElementById('otpResendTimer');
    const countdownEl = document.getElementById('otpCountdown');
    const resendLink = document.getElementById('otpResendLink');

    timerEl.style.display = 'inline';
    resendLink.style.display = 'none';
    resendLink.textContent = '📩 Resend Code';
    resendLink.style.pointerEvents = 'auto';

    let seconds = 30;
    countdownEl.textContent = seconds;

    if (otpCountdownTimer) clearInterval(otpCountdownTimer);

    otpCountdownTimer = setInterval(() => {
        seconds--;
        countdownEl.textContent = seconds;
        if (seconds <= 0) {
            clearInterval(otpCountdownTimer);
            timerEl.style.display = 'none';
            resendLink.style.display = 'inline';
        }
    }, 1000);
}

/* ✅ OTP digit input auto-advance, backspace, and paste handling */
document.addEventListener('DOMContentLoaded', () => {
    const otpInputs = document.querySelectorAll('.otp-digit');

    otpInputs.forEach((input, idx) => {
        // Auto-advance on input
        input.addEventListener('input', (e) => {
            const val = e.target.value;
            // Only allow digits
            e.target.value = val.replace(/[^0-9]/g, '');
            if (e.target.value && idx < otpInputs.length - 1) {
                otpInputs[idx + 1].focus();
            }
        });

        // Handle backspace to go to previous
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !input.value && idx > 0) {
                otpInputs[idx - 1].focus();
                otpInputs[idx - 1].value = '';
            }
            // Enter key triggers verify
            if (e.key === 'Enter') {
                handleVerifyOTP();
            }
        });

        // Handle paste (paste full OTP code)
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasteData = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
            if (pasteData.length >= 6) {
                otpInputs.forEach((inp, i) => {
                    inp.value = pasteData[i] || '';
                });
                otpInputs[5].focus();
            }
        });

        // Select all text on focus for easy replacement
        input.addEventListener('focus', () => input.select());
    });
});


/* ✅ ADMIN LOGIN → POST → backend → redirect to admin.html */
function handleAdminLogin() {
    const email = document.getElementById("adminEmail").value;
    const password = document.getElementById("adminPassword").value;

    if (!email || !password) {
        showLoginMsg('adminLoginMsg', '⚠️ Please fill in all fields', 'error');
        return;
    }

    fetch("/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                showLoginMsg('adminLoginMsg', '✅ Login successful!', 'success');
                // Store admin session
                sessionStorage.setItem('adminUser', JSON.stringify({
                    id: data.adminId,
                    name: data.adminName,
                    email: email
                }));
                setTimeout(() => {
                    window.location.href = 'admin.html';
                }, 800);
            } else {
                showLoginMsg('adminLoginMsg', '❌ ' + data.message, 'error');
            }
        })
        .catch(() => showLoginMsg('adminLoginMsg', '❌ Network error. Please try again.', 'error'));
}

/* ✅ DOCTOR LOGIN → POST → backend */
function handleDoctorLogin() {
    const email = document.getElementById("doctorEmail").value;
    const password = document.getElementById("doctorPassword").value;

    if (!email || !password) {
        showLoginMsg('doctorLoginMsg', '⚠️ Please fill in all fields', 'error');
        return;
    }

    fetch("/doctor/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                showLoginMsg('doctorLoginMsg', '✅ ' + data.message, 'success');
                // Store doctor session
                sessionStorage.setItem('doctorUser', JSON.stringify({
                    id: data.doctorId,
                    name: data.doctorName,
                    email: email,
                    specialization: data.specialization
                }));
                // Also log them in as a user for booking features
                currentUser = { id: data.doctorId, name: data.doctorName, email: email, role: 'doctor' };
                sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                updateAuthUI();
                loadFrontendDoctors();
                setTimeout(() => {
                    closeModal();
                    alert('✅ Welcome, ' + data.doctorName + '!');
                }, 600);
            } else {
                showLoginMsg('doctorLoginMsg', '❌ ' + data.message, 'error');
            }
        })
        .catch(() => showLoginMsg('doctorLoginMsg', '❌ Network error. Please try again.', 'error'));
}

/* ✅ DOCTOR SIGNUP → POST → backend */
function handleDoctorSignup() {
    const name = document.getElementById("docSignupName").value.trim();
    const email = document.getElementById("docSignupEmail").value.trim();
    const password = document.getElementById("docSignupPassword").value.trim();
    const specialization = document.getElementById("docSignupSpec").value.trim();
    const degree = document.getElementById("docSignupDegree").value.trim();
    const hospital = document.getElementById("docSignupHospital").value.trim();
    const phone = document.getElementById("docSignupPhone").value.trim();
    const available_days = document.getElementById("docSignupDays").value.trim();
    const available_time = document.getElementById("docSignupTime").value.trim();

    if (!name || !email || !password || !specialization) {
        showLoginMsg('doctorLoginMsg', '⚠️ Name, Email, Password, and Specialization are required fields.', 'error');
        return;
    }

    const payload = {
        name, email, password, specialization, degree, hospital, phone,
        available_days: available_days || 'Mon-Fri',
        available_time: available_time || '9:00 AM - 5:00 PM'
    };

    const submitBtn = document.querySelector('#doctorSignupFields .doctor-btn-submit');
    submitBtn.textContent = 'Registering...';
    submitBtn.disabled = true;

    fetch("/doctor/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
        .then(r => r.json())
        .then(data => {
            submitBtn.textContent = '🩺 Create Doctor Account';
            submitBtn.disabled = false;
            if (data.success) {
                alert('🎉 Doctor account registered successfully! You can now log in.');
                toggleDoctorSignup(false);
                loadFrontendDoctors(); // Refresh the homepage doctor list immediately
            } else {
                showLoginMsg('doctorLoginMsg', '❌ ' + (data.message || 'Registration failed.'), 'error');
            }
        })
        .catch(() => {
            submitBtn.textContent = '🩺 Create Doctor Account';
            submitBtn.disabled = false;
            showLoginMsg('doctorLoginMsg', '❌ Network error. Please try again.', 'error');
        });
}

// ✅ Driver Login from Modal
async function handleDriverLoginModal() {
    const email = document.getElementById('drvLoginEmail').value.trim();
    const password = document.getElementById('drvLoginPassword').value;
    if (!email || !password) { showLoginMsg('driverLoginMsg', '⚠️ Please fill in all fields', 'error'); return; }

    const btn = document.querySelector('#driverLoginFields .driver-btn-submit');
    btn.disabled = true;
    btn.textContent = 'Signing in...';

    try {
        const res = await fetch('/driver/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.success) {
            showLoginMsg('driverLoginMsg', '✅ Login successful! Redirecting...', 'success');
            sessionStorage.setItem('driverUser', JSON.stringify({
                id: data.driverId, name: data.driverName, email: data.email, status: data.status
            }));
            setTimeout(() => { window.location.href = 'driver-dashboard.html'; }, 800);
        } else {
            showLoginMsg('driverLoginMsg', '❌ ' + data.message, 'error');
            btn.disabled = false;
            btn.textContent = '🚐 Driver Login';
        }
    } catch (e) {
        showLoginMsg('driverLoginMsg', '❌ Network error. Please try again.', 'error');
        btn.disabled = false;
        btn.textContent = '🚐 Driver Login';
    }
}

// ✅ Driver Signup from Modal
async function handleDriverSignupModal() {
    const name = document.getElementById('drvSignupName').value.trim();
    const email = document.getElementById('drvSignupEmail').value.trim();
    const password = document.getElementById('drvSignupPassword').value;
    const phone = document.getElementById('drvSignupPhone').value.trim();
    const licenseNumber = document.getElementById('drvSignupLicense').value.trim();
    const vehicleId = document.getElementById('drvSignupVehicleId').value.trim();
    const plateNumber = document.getElementById('drvSignupPlate').value.trim();
    const ambulanceType = document.getElementById('drvSignupAmbType').value;

    if (!name || !email || !password || !vehicleId || !plateNumber) {
        showLoginMsg('driverLoginMsg', '⚠️ Name, email, password, vehicle ID and plate number are required', 'error'); return;
    }

    const btn = document.querySelector('#driverSignupFields .driver-btn-submit');
    btn.disabled = true;
    btn.textContent = 'Creating account...';

    try {
        const res = await fetch('/driver/signup', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, phone, licenseNumber, vehicleId, plateNumber, ambulanceType })
        });
        const data = await res.json();
        if (data.success) {
            alert('🎉 Driver account registered successfully! You can now log in.');
            toggleDriverSignup(false);
        } else {
            showLoginMsg('driverLoginMsg', '❌ ' + (data.message || 'Registration failed.'), 'error');
        }
    } catch (e) {
        showLoginMsg('driverLoginMsg', '❌ Network error. Please try again.', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '🚐 Create Driver Account';
    }
}

// ✅ Open booking modal (requires login)
function openBookingModal() {
    if (!currentUser) {
        document.getElementById("loginRequiredModal").style.display = "block";
        return;
    }
    document.getElementById("bookingModal").style.display = "block";
    resetBookingForm();
}

// ✅ Open booking modal with location from search bar
function openBookingWithLocation() {
    if (!currentUser) {
        document.getElementById("loginRequiredModal").style.display = "block";
        return;
    }
    const location = document.getElementById("quickPickupLocation").value;
    openBookingModal();
    if (location) {
        document.getElementById("pickupLocation").value = location;
    }
}

// ✅ Close booking modal
function closeBookingModal() {
    document.getElementById("bookingModal").style.display = "none";
    resetBookingForm();
}

// ✅ Reset booking form
function resetBookingForm() {
    document.getElementById("patientName").value = "";
    document.getElementById("patientPhone").value = "";
    document.getElementById("pickupLocation").value = "";
    document.getElementById("dropLocation").value = "";
    document.getElementById("emergencyType").value = "";
    document.getElementById("bookingNotes").value = "";
    document.getElementById("bookingMessage").className = "booking-message";
    document.getElementById("bookingMessage").innerHTML = "";
    document.getElementById("bookingForm").style.display = "block";
    document.getElementById("bookingSubmitBtn").disabled = false;
    document.getElementById("bookingSubmitBtn").classList.remove("loading");
}




// ✅ Validate booking form
function validateBookingForm() {
    const patientName = document.getElementById("patientName").value.trim();
    const phone = document.getElementById("patientPhone").value.trim();
    const pickup = document.getElementById("pickupLocation").value.trim();
    const drop = document.getElementById("dropLocation").value.trim();
    const emergency = document.getElementById("emergencyType").value;

    if (!patientName || !phone || !pickup || !drop || !emergency) {
        showBookingMessage("Please fill in all required fields.", "error");
        return false;
    }

    // Basic phone validation
    if (phone.length < 10) {
        showBookingMessage("Please enter a valid phone number.", "error");
        return false;
    }

    return true;
}

// ✅ Show booking message
function showBookingMessage(message, type) {
    const msgEl = document.getElementById("bookingMessage");
    msgEl.innerHTML = message;
    msgEl.className = "booking-message " + type;
}

// ✅ Handle booking submission
function handleBooking() {
    if (!validateBookingForm()) return;

    const submitBtn = document.getElementById("bookingSubmitBtn");
    submitBtn.disabled = true;
    submitBtn.classList.add("loading");

    const booking = {
        userId: currentUser.id,
        patientName: document.getElementById("patientName").value.trim(),
        phone: document.getElementById("patientPhone").value.trim(),
        pickupLocation: document.getElementById("pickupLocation").value.trim(),
        dropLocation: document.getElementById("dropLocation").value.trim(),
        emergencyType: document.getElementById("emergencyType").value,
        notes: document.getElementById("bookingNotes").value.trim()
    };

    fetch("/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(booking)
    })
        .then(r => r.json())
        .then(data => {
            submitBtn.disabled = false;
            submitBtn.classList.remove("loading");

            if (data.success) {
                document.getElementById("bookingForm").style.display = "none";
                let ambHtml = '';
                if (data.ambulance) {
                    ambHtml = `<div class="amb-details-card">
                        <div class="amb-details-title">🚑 Assigned Ambulance</div>
                        <div class="amb-details-grid">
                            <div><span>Vehicle:</span> <strong>${data.ambulance.vehicle_id}</strong></div>
                            <div><span>Plate:</span> <strong>${data.ambulance.plate_number}</strong></div>
                            <div><span>Type:</span> <strong>${data.ambulance.equipment || data.ambulance.ambulance_type}</strong></div>
                            ${data.ambulance.driver_name ? `<div><span>Driver:</span> <strong>${data.ambulance.driver_name}</strong></div>` : ''}
                            ${data.ambulance.driver_phone ? `<div><span>Phone:</span> <strong>${data.ambulance.driver_phone}</strong></div>` : ''}
                        </div>
                    </div>
                    <a href="/tracking.html?bookingId=${data.bookingId}" class="track-live-btn" target="_blank">🗺️ Track Live Now</a>`;
                } else {
                    ambHtml = `<div class="amb-details-card" style="background:linear-gradient(135deg,#fff8ed,#fff3e0);border-color:#ffe0b2;">
                        <div class="amb-details-title" style="color:#e67e22;">⏳ Waiting for Driver</div>
                        <p style="font-size:0.9em;color:#666;margin:0;">Your booking is pending. An available driver will accept your ride shortly. You'll receive a notification once a driver is on the way.</p>
                    </div>`;
                }
                showBookingMessage(
                    `✅ ${data.message}<br><br>
                     Your Booking ID: <span class="booking-id" style="font-size: 1.5em; display: block; margin: 10px 0;">#${data.bookingId}</span>
                     ${ambHtml}`,
                    "success"
                );
            } else {
                showBookingMessage(data.message || "Booking failed. Please try again.", "error");
            }
        })
        .catch(err => {
            submitBtn.disabled = false;
            submitBtn.classList.remove("loading");
            showBookingMessage("Network error. Please check your connection.", "error");
        });
}

// ✅ Close Login Required Modal
function closeLoginRequiredModal() {
    document.getElementById("loginRequiredModal").style.display = "none";
}

// ✅ Open History Modal
function openHistoryModal() {
    document.getElementById("historyModal").style.display = "block";
    loadBookingHistory();
}

// ✅ Close History Modal
function closeHistoryModal() {
    document.getElementById("historyModal").style.display = "none";
}

// ✅ Load Booking History + Doctor Appointments
async function loadBookingHistory() {
    const historyContent = document.getElementById("historyContent");

    if (!currentUser) {
        historyContent.innerHTML = `
            <div class="history-empty">
                <div class="icon">🔒</div>
                <p>Please login to view your bookings</p>
            </div>
        `;
        return;
    }

    historyContent.innerHTML = `
        <div class="history-empty">
            <div class="icon">⏳</div>
            <p>Loading your bookings...</p>
        </div>
    `;

    try {
        let bookingsRes = { success: false };
        let appointmentsRes = { success: false };

        // Role-based logic to fetch data
        if (currentUser.role === 'doctor') {
            appointmentsRes = await fetch(`/doctor/appointments/${encodeURIComponent(currentUser.name)}`).then(r => r.json()).catch(() => ({ success: false }));
        } else {
            const res = await Promise.all([
                fetch(`/user/bookings/${currentUser.id}`).then(r => r.json()).catch(() => ({ success: false })),
                fetch(`/user/appointments/${currentUser.id}`).then(r => r.json()).catch(() => ({ success: false }))
            ]);
            bookingsRes = res[0];
            appointmentsRes = res[1];
        }

        let html = '';
        const hasBookings = bookingsRes.success && bookingsRes.bookings && bookingsRes.bookings.length > 0;
        const hasAppointments = appointmentsRes.success && appointmentsRes.appointments && appointmentsRes.appointments.length > 0;

        // === Ambulance Bookings Section (Users Only) ===
        if (currentUser.role !== 'doctor') {
            html += '<h3 style="color: var(--primary-color); margin-bottom: 15px; font-size: 1.1em;">🚑 Ambulance Bookings</h3>';
            if (hasBookings) {
                html += bookingsRes.bookings.map(booking => `
                    <div class="history-item" id="booking-${booking.id}">
                        <div class="history-item-header">
                            <span class="history-item-id">Booking #${booking.id}</span>
                            <span class="history-status ${booking.status}">${booking.status}</span>
                        </div>
                        <div class="history-item-details">
                            <div><span>Patient:</span> <strong>${escapeHtml(booking.patient_name)}</strong></div>
                            <div><span>Phone:</span> <strong>${escapeHtml(booking.phone)}</strong></div>
                            <div><span>Pickup:</span> <strong>${escapeHtml(booking.pickup_location)}</strong></div>
                            <div><span>Destination:</span> <strong>${escapeHtml(booking.drop_location)}</strong></div>
                            <div><span>Emergency:</span> <strong>${booking.emergency_type}</strong></div>
                            <div><span>Date:</span> <strong>${formatDate(booking.created_at)}</strong></div>
                        </div>
                        ${(booking.status === 'pending' || booking.status === 'dispatched') ?
                        `<button class="cancel-booking-btn" onclick="cancelBooking(${booking.id})">❌ Cancel Booking</button>` : ''}
                        ${(booking.status === 'pending') ?
                        `<span style="display:inline-block; margin-top:10px; margin-left:8px; background:rgba(255,165,2,0.12); color:#f39c12; padding:8px 16px; border-radius:6px; font-weight:600; font-size:0.85em; border:1px solid rgba(255,165,2,0.25);">⏳ Awaiting Dispatch</span>` : ''}
                        ${(booking.status === 'dispatched') ?
                        `<a href="/tracking.html?bookingId=${booking.id}" style="display:inline-block; margin-top:10px; margin-left:8px; background: linear-gradient(135deg, #00d4ff, #0099cc); color:white; padding:8px 16px; border-radius:6px; text-decoration:none; font-weight:600; font-size:0.85em; transition:all 0.3s ease;">🗺️ Track Live</a>` : ''}
                        ${(booking.status === 'completed' && !booking.driver_rating) ?
                        `<button class="rate-driver-btn" onclick="openRateModal(${booking.id})" style="display:inline-block; margin-top:10px; background: linear-gradient(135deg, #f1c40f, #f39c12); color:white; border:none; padding:8px 16px; border-radius:6px; font-weight:600; font-size:0.85em; cursor:pointer;">⭐ Rate Driver</button>` : ''}
                        ${(booking.status === 'completed' && booking.driver_rating) ?
                        `<span style="display:inline-block; margin-top:10px; background: rgba(241, 196, 15, 0.1); color: #f39c12; padding:8px 16px; border-radius:6px; font-weight:600; font-size:0.85em;">⭐ You Rated: ${booking.driver_rating}/5</span>` : ''}
                    </div>
                `).join('');
            } else {
                html += `<div class="history-empty" style="padding: 20px;">
                    <p style="color: #999; font-size: 0.95em;">No ambulance bookings yet.</p>
                </div>`;
            }
        }

        // === Doctor Appointments Section ===
        const apptHeading = currentUser.role === 'doctor' ? '👨‍⚕️ My Patient Appointments' : '🩺 Doctor Appointments';
        html += `<h3 style="color: #667eea; margin: 25px 0 15px; font-size: 1.1em; border-top: ${currentUser.role === 'doctor' ? 'none' : '1px solid #eee'}; padding-top: ${currentUser.role === 'doctor' ? '0' : '20px'};">${apptHeading}</h3>`;
        if (hasAppointments) {
            html += appointmentsRes.appointments.map(appt => {
                const statusColors = {
                    'pending': '#f39c12',
                    'confirmed': '#667eea',
                    'completed': '#27ae60',
                    'cancelled': '#95a5a6'
                };
                const statusColor = statusColors[appt.status] || '#999';

                return `
                    <div class="history-item" style="border-left: 4px solid ${statusColor};">
                        <div class="history-item-header">
                            <span class="history-item-id">Appointment #${appt.id}</span>
                            <span class="history-status ${appt.status}" style="background: ${statusColor}22; color: ${statusColor};">${appt.status}</span>
                        </div>
                        <div class="history-item-details">
                            <div><span>Doctor:</span> <strong>${escapeHtml(appt.doctor_name)} <span style="font-size:0.85em; color:#666; font-weight:normal;">(${escapeHtml(appt.doctor_degree || '')})</span></strong></div>
                            <div><span>Specialty:</span> <strong>${escapeHtml(appt.specialization || '-')}</strong></div>
                            <div><span>Date:</span> <strong>${formatDate(appt.appointment_date)}</strong></div>
                            <div><span>Time:</span> <strong>${escapeHtml(appt.appointment_time)}</strong></div>
                            <div><span>Patient:</span> <strong>${escapeHtml(appt.patient_name)}</strong></div>
                            <div><span>Phone:</span> <strong>${escapeHtml(appt.phone || '-')}</strong></div>
                        </div>
                        ${appt.reason ? `<div style="margin-top: 8px; font-size: 0.9em; color: #666;"><span>Reason:</span> ${escapeHtml(appt.reason)}</div>` : ''}
                    </div>
                `;
            }).join('');
        } else {
            html += `<div class="history-empty" style="padding: 20px;">
                <p style="color: #999; font-size: 0.95em;">No doctor appointments yet.</p>
            </div>`;
        }

        if (!hasBookings && !hasAppointments) {
            historyContent.innerHTML = `
                <div class="history-empty">
                    <div class="icon">📭</div>
                    <p>No bookings or appointments yet.</p>
                </div>
            `;
        } else {
            historyContent.innerHTML = html;
        }
    } catch (error) {
        historyContent.innerHTML = `
            <div class="history-empty">
                <div class="icon">⚠️</div>
                <p>Failed to load bookings. Please try again.</p>
            </div>
        `;
    }
}

// ✅ Escape HTML for security
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ✅ Format date
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ✅ Cancel Booking
async function cancelBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking?')) {
        return;
    }

    const btn = document.querySelector(`#booking-${bookingId} .cancel-booking-btn`);
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Cancelling...';
    }

    try {
        const response = await fetch(`/user/bookings/${bookingId}/cancel`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id })
        });

        const data = await response.json();

        if (data.success) {
            alert('Booking cancelled successfully!');
            loadBookingHistory(); // Refresh the list
        } else {
            alert(data.message || 'Failed to cancel booking');
            if (btn) {
                btn.disabled = false;
                btn.textContent = '❌ Cancel Booking';
            }
        }
    } catch (error) {
        alert('Network error. Please try again.');
        if (btn) {
            btn.disabled = false;
            btn.textContent = '❌ Cancel Booking';
        }
    }
}

// ✅ Close modals when clicking outside
window.onclick = function (event) {
    if (event.target.classList.contains("modal")) {
        event.target.style.display = "none";
        if (event.target.id === "bookingModal") {
            resetBookingForm();
        } else if (event.target.id === "rateModal") {
            closeRateModal();
        }
    }
}


// ============================================
// DRIVER RATING FUNCTIONS
// ============================================

function openRateModal(bookingId) {
    document.getElementById('rateBookingId').value = bookingId;
    document.getElementById('selectedRating').value = '0';
    selectRating(0); // Reset stars
    document.getElementById('rateModal').style.display = 'block';
}

function closeRateModal() {
    document.getElementById('rateModal').style.display = 'none';
}

function selectRating(rating) {
    document.getElementById('selectedRating').value = rating;
    const stars = document.querySelectorAll('#starSelection .star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.style.color = '#f1c40f'; // Gold
        } else {
            star.style.color = '#ccc'; // Gray
        }
    });
}

async function submitRating() {
    const bookingId = document.getElementById('rateBookingId').value;
    const rating = parseInt(document.getElementById('selectedRating').value);

    if (rating < 1 || rating > 5) {
        alert('Please select a star rating first!');
        return;
    }

    const btn = document.getElementById('submitRateBtn');
    btn.disabled = true;
    btn.textContent = 'Submitting...';

    try {
        const response = await fetch(`/user/bookings/${bookingId}/rate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating })
        });

        const data = await response.json();

        if (data.success) {
            closeRateModal();
            alert('Thanks for your feedback!');
            loadBookingHistory(); // Refresh the list
        } else {
            alert(data.message || 'Failed to submit rating');
        }
    } catch (error) {
        alert('Network error. Please try again.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Submit Rating';
    }
}

// ============================================
// DOCTOR APPOINTMENT FUNCTIONS
// ============================================

let selectedDoctorId = null;
let selectedDoctorName = '';
let selectedDoctorSpecialty = '';
let selectedDoctorDegree = '';

// Specialization → avatar color class and icon mapping
function getDoctorAvatarInfo(specialization) {
    const spec = (specialization || '').toLowerCase();
    const map = {
        'cardiologist': { cls: 'cardio', icon: '❤️' },
        'cardiology': { cls: 'cardio', icon: '❤️' },
        'neurologist': { cls: 'neuro', icon: '🧠' },
        'neurology': { cls: 'neuro', icon: '🧠' },
        'orthopedic': { cls: 'ortho', icon: '🦴' },
        'orthopedic surgeon': { cls: 'ortho', icon: '🦴' },
        'pediatrician': { cls: 'pedia', icon: '👶' },
        'pediatrics': { cls: 'pedia', icon: '👶' },
        'dermatologist': { cls: 'derma', icon: '🧑‍⚕️' },
        'dermatology': { cls: 'derma', icon: '🧑‍⚕️' },
        'ent specialist': { cls: 'ent', icon: '👂' },
        'ent': { cls: 'ent', icon: '👂' },
        'gynecologist': { cls: 'gyno', icon: '🫀' },
        'gynecology': { cls: 'gyno', icon: '🫀' },
        'general physician': { cls: 'general', icon: '🩺' },
        'general': { cls: 'general', icon: '🩺' }
    };
    for (const [key, val] of Object.entries(map)) {
        if (spec.includes(key)) return val;
    }
    return { cls: 'general', icon: '🩺' };
}

// Generate star rating HTML
function getStarRating(rating) {
    const r = parseFloat(rating) || 0;
    const full = Math.floor(r);
    let stars = '⭐'.repeat(Math.min(full, 5));
    return stars + ' ' + r.toFixed(1);
}

// Load doctors from backend API
async function loadFrontendDoctors() {
    const grid = document.getElementById('doctorsGrid');
    try {
        const response = await fetch('/doctors');
        const data = await response.json();

        if (data.success && data.doctors && data.doctors.length > 0) {
            const isDoctor = currentUser && currentUser.role === 'doctor';
            grid.innerHTML = data.doctors.map(doc => {
                const avatar = getDoctorAvatarInfo(doc.specialization);
                const availDays = doc.available_days || 'Mon-Fri';
                const availTime = doc.available_time || '9:00 AM - 5:00 PM';
                const escapedName = (doc.name || '').replace(/'/g, "\\'");
                const escapedSpec = (doc.specialization || '').replace(/'/g, "\\'");
                const escapedDeg = (doc.degree || '').replace(/'/g, "\\'");
                const bookBtn = isDoctor ? '' : `<button class="book-appt-btn" onclick="openApptModal(${doc.id}, '${escapedName}', '${escapedSpec}', '${escapedDeg}')">Book Appointment</button>`;

                // Hospital Details logic
                let hospitalInfoHtml = '';
                if (doc.hospital) {
                    const hPhone = doc.h_phone ? `📞 ${doc.h_phone}` : '';
                    const hAddress = doc.h_address ? `📍 ${doc.h_address}` : '';
                    hospitalInfoHtml = `
                        <div class="doctor-hospital-details glassmorphism-card">
                            <div class="hospital-name-header">
                                <span class="h-icon">🏥</span> <strong>${doc.hospital}</strong>
                            </div>
                            <div class="hospital-info-lines">
                                ${hAddress ? `<div class="info-line"><span class="h-icon"></span>${hAddress}</div>` : ''}
                                ${hPhone ? `<div class="info-line"><span class="h-icon"></span>${hPhone}</div>` : ''}
                            </div>
                        </div>
                    `;
                } else {
                    hospitalInfoHtml = `<p class="doctor-experience" style="margin-top:10px;">${doc.hospital || ''}</p>`;
                }

                return `
                    <div class="doctor-card">
                        <div class="doctor-avatar ${avatar.cls}">${avatar.icon}</div>
                        <h3>${doc.name}</h3>
                        <p style="font-size: 0.9em; color: #666; margin-bottom: 5px;">${doc.degree || ''}</p>
                        <p class="doctor-specialty">${doc.specialization}</p>
                        <p class="doctor-rating">${getStarRating(doc.rating)}</p>
                        
                        ${hospitalInfoHtml}
                        
                        <span class="doctor-availability available">● ${availDays} | ${availTime}</span>
                        <br><br>
                        ${bookBtn}
                    </div>
                `;
            }).join('');
        } else {
            grid.innerHTML = '<p style="color: #666; grid-column: 1 / -1; text-align: center;">No doctors available at the moment. Please check back later.</p>';
        }
    } catch (error) {
        console.error('Error loading doctors:', error);
        grid.innerHTML = '<p style="color: #999; grid-column: 1 / -1; text-align: center;">Unable to load doctors. Please try again later.</p>';
    }
}

// Open appointment modal
function openApptModal(doctorId, doctorName, specialty, degree) {
    if (!currentUser) {
        document.getElementById('loginRequiredModal').style.display = 'block';
        return;
    }
    selectedDoctorId = doctorId;
    selectedDoctorName = doctorName;
    selectedDoctorSpecialty = specialty;
    selectedDoctorDegree = degree || '';
    document.getElementById('selectedDoctor').innerHTML = `
        <div style="font-size: 1.3em; margin-bottom: 5px;">🩺 ${doctorName} <span style="font-size:0.8em; opacity:0.8;">(${selectedDoctorDegree})</span></div>
        <div style="font-size: 0.9em; opacity: 0.8;">${specialty}</div>
    `;
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('apptDate').setAttribute('min', today);
    // Pre-fill name and email if logged in
    if (currentUser) {
        document.getElementById('apptPatientName').value = currentUser.name || '';
        document.getElementById('apptEmail').value = currentUser.email || '';
    }
    document.getElementById('apptModal').style.display = 'block';
    
    // Reset time slots just in case
    const timeSelect = document.getElementById('apptTime');
    for (let i = 1; i < timeSelect.options.length; i++) {
        timeSelect.options[i].disabled = false;
        timeSelect.options[i].text = timeSelect.options[i].value;
    }
}

// Attach event listener for date change to fetch booked slots
document.addEventListener('DOMContentLoaded', () => {
    const apptDateInput = document.getElementById('apptDate');
    if (apptDateInput) {
        apptDateInput.addEventListener('change', async function() {
            const date = this.value;
            const timeSelect = document.getElementById('apptTime');
            
            // Reset all options first
            for (let i = 1; i < timeSelect.options.length; i++) {
                timeSelect.options[i].disabled = false;
                timeSelect.options[i].text = timeSelect.options[i].value;
            }
            
            if (!date || !selectedDoctorId) return;
            
            try {
                const response = await fetch(`/doctor/${selectedDoctorId}/booked-slots?date=${date}`);
                const data = await response.json();
                
                if (data.success && data.bookedSlots) {
                    for (let i = 1; i < timeSelect.options.length; i++) {
                        if (data.bookedSlots.includes(timeSelect.options[i].value)) {
                            timeSelect.options[i].disabled = true;
                            timeSelect.options[i].text = timeSelect.options[i].value + ' (Booked)';
                        }
                    }
                    
                    // If currently selected time is now disabled, reset selection
                    if (timeSelect.options[timeSelect.selectedIndex] && timeSelect.options[timeSelect.selectedIndex].disabled) {
                        timeSelect.value = "";
                    }
                }
            } catch (err) {
                console.error("Error fetching booked slots:", err);
            }
        });
    }
});

// Close appointment modal
function closeApptModal() {
    document.getElementById('apptModal').style.display = 'none';
    resetApptForm();
}

// Reset appointment form
function resetApptForm() {
    document.getElementById('apptPatientName').value = '';
    document.getElementById('apptPhone').value = '';
    document.getElementById('apptEmail').value = '';
    document.getElementById('apptDate').value = '';
    document.getElementById('apptTime').value = '';
    document.getElementById('apptReason').value = '';
    document.getElementById('apptMessage').className = 'appt-message';
    document.getElementById('apptMessage').innerHTML = '';
    document.getElementById('apptForm').style.display = 'block';
    document.getElementById('apptSubmitBtn').disabled = false;
}

// Handle appointment booking submit
async function handleApptBooking() {
    const name = document.getElementById('apptPatientName').value.trim();
    const phone = document.getElementById('apptPhone').value.trim();
    const email = document.getElementById('apptEmail').value.trim();
    const date = document.getElementById('apptDate').value;
    const time = document.getElementById('apptTime').value;
    const reason = document.getElementById('apptReason').value.trim();

    if (!name || !phone || !email || !date || !time) {
        showApptMessage('Please fill in all required fields.', 'error');
        return;
    }

    // Phone validation
    if (!/^[0-9]{10}$/.test(phone.replace(/[\s-]/g, ''))) {
        showApptMessage('Please enter a valid 10-digit phone number.', 'error');
        return;
    }

    const submitBtn = document.getElementById('apptSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Booking...';

    try {
        const response = await fetch('/appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser ? currentUser.id : null,
                doctorId: selectedDoctorId,
                doctorName: selectedDoctorName,
                specialization: selectedDoctorSpecialty,
                doctorDegree: selectedDoctorDegree,
                patientName: name,
                phone: phone,
                email: email,
                appointmentDate: date,
                appointmentTime: time,
                reason: reason
            })
        });

        const data = await response.json();

        if (data.success) {
            showApptMessage(
                `✅ Appointment booked successfully!<br><br>` +
                `<span style="font-size: 1.1em; font-weight: 700; color: #667eea;">Appointment ID: #${data.appointmentId}</span><br><br>` +
                `<strong>Doctor:</strong> ${selectedDoctorName} (${selectedDoctorDegree})<br>` +
                `<strong>Specialty:</strong> ${selectedDoctorSpecialty}<br>` +
                `<strong>Date:</strong> ${date}<br>` +
                `<strong>Time:</strong> ${time}<br><br>` +
                `<em>You will receive a confirmation on ${email}</em>`,
                'success'
            );
            document.getElementById('apptForm').style.display = 'none';
        } else {
            showApptMessage(data.message || 'Failed to book appointment. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Booking error:', error);
        showApptMessage('Network error. Please check your connection and try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirm Appointment';
    }
}

// Show appointment message
function showApptMessage(msg, type) {
    const msgEl = document.getElementById('apptMessage');
    msgEl.innerHTML = msg;
    msgEl.className = 'appt-message ' + type;
}

// Close appointment modal on outside click
window.addEventListener('click', function (event) {
    if (event.target === document.getElementById('apptModal')) {
        closeApptModal();
    }
    // Close notif panel on outside click
    const panel = document.getElementById('notifPanel');
    const bell = document.querySelector('.notif-bell-wrap');
    if (panel && panel.classList.contains('open') && !panel.contains(event.target) && (!bell || !bell.contains(event.target))) {
        panel.classList.remove('open');
    }
});

// ============================================
// NOTIFICATION SYSTEM
// ============================================
let notifSocket = null;

function connectNotificationSocket() {
    if (!currentUser || notifSocket) return;
    try {
        notifSocket = io();
        notifSocket.emit('join-user-room', currentUser.id);
        notifSocket.on('new-notification', (data) => {
            loadNotifications();
        });
    } catch (e) { console.log('Socket not available'); }
}

function toggleNotifPanel() {
    const panel = document.getElementById('notifPanel');
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) loadNotifications();
}

async function loadNotifications() {
    if (!currentUser) return;
    try {
        const res = await fetch(`/user/notifications/${currentUser.id}`);
        const data = await res.json();
        if (!data.success) return;
        const list = document.getElementById('notifList');
        const unread = data.notifications.filter(n => !n.is_read).length;
        const badge = document.getElementById('notifBadge');
        if (badge) {
            badge.textContent = unread;
            badge.style.display = unread > 0 ? 'flex' : 'none';
        }
        if (data.notifications.length === 0) {
            list.innerHTML = '<div class="notif-empty">No notifications yet</div>';
            return;
        }
        list.innerHTML = data.notifications.map(n => {
            const timeAgo = getTimeAgo(new Date(n.created_at));
            const icons = { booking_confirmed: '🚑', booking_cancelled: '❌', ambulance_dispatched: '🚨', ambulance_at_pickup: '📍', ambulance_at_hospital: '🏥', appointment_confirmed: '✅', appointment_completed: '🏥', appointment_cancelled: '❌', appointment_pending: '🕐' };
            const icon = icons[n.type] || '🔔';
            return `<div class="notif-item ${n.is_read ? 'read' : 'unread'}" onclick="markNotifRead(${n.id}, this)">
                <div class="notif-icon">${icon}</div>
                <div class="notif-body">
                    <div class="notif-title">${n.title}</div>
                    <div class="notif-msg">${n.message}</div>
                    <div class="notif-time">${timeAgo}</div>
                </div>
                ${!n.is_read ? '<div class="notif-dot"></div>' : ''}
            </div>`;
        }).join('');
    } catch (e) { console.error('Failed to load notifications:', e); }
}

async function markNotifRead(id, el) {
    try {
        await fetch(`/user/notifications/${id}/read`, { method: 'POST' });
        if (el) { el.classList.remove('unread'); el.classList.add('read'); const dot = el.querySelector('.notif-dot'); if (dot) dot.remove(); }
        // Update badge count
        const badge = document.getElementById('notifBadge');
        if (badge) { let c = parseInt(badge.textContent) - 1; badge.textContent = Math.max(0, c); if (c <= 0) badge.style.display = 'none'; }
    } catch (e) { }
}

async function markAllNotificationsRead() {
    if (!currentUser) return;
    try {
        await fetch(`/user/notifications/read-all/${currentUser.id}`, { method: 'POST' });
        loadNotifications();
    } catch (e) { }
}

function getTimeAgo(date) {
    const s = Math.floor((Date.now() - date.getTime()) / 1000);
    if (s < 60) return 'Just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return Math.floor(s / 86400) + 'd ago';
}

// Poll notifications every 30s
setInterval(() => { if (currentUser) loadNotifications(); }, 30000);

/* =========================================
   CHATBOT LOGIC
   ========================================= */

let chatHistory = [];

function toggleChatbot() {
    const widget = document.getElementById('chatbotWidget');
    widget.classList.toggle('active');
}

function handleChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}

async function sendChatMessage() {
    const inputField = document.getElementById('chatInput');
    const message = inputField.value.trim();
    if (!message) return;

    // Display user message
    addChatMessage(message, 'user');
    inputField.value = '';

    // Add to history
    chatHistory.push({ role: "user", content: message });

    // Show typing indicator
    const typingId = showTypingIndicator();

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: chatHistory })
        });

        removeTypingIndicator(typingId);

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
            addChatMessage(`Error: ${data.error}`, 'bot');
            return;
        }

        const botReply = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        if (botReply) {
            addChatMessage(botReply, 'bot');
            chatHistory.push({ role: "assistant", content: botReply });
        } else {
            addChatMessage("Sorry, I received an invalid response.", 'bot');
        }

    } catch (error) {
        removeTypingIndicator(typingId);
        console.error("Chatbot error:", error);
        addChatMessage("Sorry, the servers are unreachable right now.", 'bot');
    }
}

function addChatMessage(text, sender) {
    const chatbotBody = document.getElementById('chatbotBody');
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${sender === 'user' ? 'user-message' : 'bot-message'}`;

    // Convert basic markdown-like newlines to HTML
    msgDiv.innerHTML = text.replace(/\\n/g, '<br>').replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>');

    chatbotBody.appendChild(msgDiv);
    chatbotBody.scrollTop = chatbotBody.scrollHeight;
}

function showTypingIndicator() {
    const chatbotBody = document.getElementById('chatbotBody');
    const typingDiv = document.createElement('div');
    const typingId = 'typing-' + Date.now();
    typingDiv.id = typingId;
    typingDiv.className = 'chat-typing';
    typingDiv.innerHTML = '<span></span><span></span><span></span>';

    chatbotBody.appendChild(typingDiv);
    chatbotBody.scrollTop = chatbotBody.scrollHeight;

    return typingId;
}

function removeTypingIndicator(id) {
    const typingDiv = document.getElementById(id);
    if (typingDiv) {
        typingDiv.remove();
    }
}

// ✅ HOSPITAL LOGIN
async function handleHospitalLoginIndex() {
    const email = document.getElementById('hospitalEmail').value.trim();
    const password = document.getElementById('hospitalPassword').value.trim();
    const msg = document.getElementById('hospitalLoginMsg');

    if (!email || !password) {
        msg.className = 'login-msg error';
        msg.innerHTML = 'Please enter email and password';
        return;
    }

    try {
        const response = await fetch("/hospital/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        if (data.success) {
            msg.className = 'login-msg success';
            msg.innerHTML = 'Login successful! Redirecting...';
            localStorage.setItem("hospitalId", data.hospitalId);
            localStorage.setItem("hospitalName", data.hospitalName);
            setTimeout(() => {
                window.location.href = "/hospital-dashboard.html";
            }, 1000);
        } else {
            msg.className = 'login-msg error';
            msg.innerHTML = data.message;
        }
    } catch (err) {
        msg.className = 'login-msg error';
        msg.innerHTML = 'Connection error. Please try again.';
    }
}

// ✅ DOCTORS MODAL
function openDoctorsModal() {
    document.getElementById('doctorsModal').style.display = 'block';
}

function closeDoctorsModal() {
    document.getElementById('doctorsModal').style.display = 'none';
}