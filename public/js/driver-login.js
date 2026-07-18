        // Check if driver already logged in
        window.onload = function () {
            const driver = sessionStorage.getItem('driverUser');
            if (driver) window.location.href = 'driver-dashboard.html';
        };

        function toggleForm(showSignup) {
            document.getElementById('loginFields').style.display = showSignup ? 'none' : 'block';
            document.getElementById('signupFields').style.display = showSignup ? 'block' : 'none';
            document.getElementById('formTitle').textContent = showSignup ? 'Driver Registration' : 'Driver Login';
            document.getElementById('formSubtitle').textContent = showSignup ? 'Join the TrackNHeal driver network' : 'Access your ambulance dashboard';
            clearMsg();
        }

        function showMsg(text, type) {
            const el = document.getElementById('formMessage');
            el.innerHTML = text;
            el.className = 'dl-msg ' + type;
        }
        function clearMsg() {
            const el = document.getElementById('formMessage');
            el.className = 'dl-msg';
            el.innerHTML = '';
        }

        async function handleDriverLogin() {
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            if (!email || !password) { showMsg('⚠️ Please fill in all fields', 'error'); return; }

            const btn = document.getElementById('loginBtn');
            btn.disabled = true;
            btn.querySelector('.btn-text').textContent = 'Signing in...';

            try {
                const res = await fetch('/driver/login', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                if (data.success) {
                    showMsg('✅ Login successful! Redirecting...', 'success');
                    sessionStorage.setItem('driverUser', JSON.stringify({
                        id: data.driverId, name: data.driverName, email: data.email, status: data.status
                    }));
                    setTimeout(() => { window.location.href = 'driver-dashboard.html'; }, 800);
                } else {
                    showMsg('❌ ' + data.message, 'error');
                    btn.disabled = false;
                    btn.querySelector('.btn-text').textContent = 'Sign In';
                }
            } catch (e) {
                showMsg('❌ Network error. Please try again.', 'error');
                btn.disabled = false;
                btn.querySelector('.btn-text').textContent = 'Sign In';
            }
        }

        async function handleDriverSignup() {
            const name = document.getElementById('signupName').value.trim();
            const email = document.getElementById('signupEmail').value.trim();
            const password = document.getElementById('signupPassword').value;
            const phone = document.getElementById('signupPhone').value.trim();
            const licenseNumber = document.getElementById('signupLicense').value.trim();
            const vehicleId = document.getElementById('signupVehicleId').value.trim();
            const plateNumber = document.getElementById('signupPlate').value.trim();
            const ambulanceType = document.getElementById('signupAmbType').value;

            if (!name || !email || !password || !vehicleId || !plateNumber) {
                showMsg('⚠️ Name, email, password, vehicle ID and plate number are required', 'error'); return;
            }

            const btn = document.getElementById('signupBtn');
            btn.disabled = true;
            btn.querySelector('.btn-text').textContent = 'Creating account...';

            try {
                const res = await fetch('/driver/signup', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password, phone, licenseNumber, vehicleId, plateNumber, ambulanceType })
                });
                const data = await res.json();
                if (data.success) {
                    showMsg('✅ Account created! You can now sign in.', 'success');
                    setTimeout(() => toggleForm(false), 1500);
                } else {
                    showMsg('❌ ' + data.message, 'error');
                }
            } catch (e) {
                showMsg('❌ Network error. Please try again.', 'error');
            } finally {
                btn.disabled = false;
                btn.querySelector('.btn-text').textContent = 'Create Account';
            }
        }

        // Enter key support
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                if (document.getElementById('loginFields').style.display !== 'none') handleDriverLogin();
                else handleDriverSignup();
            }
        });
