        let driverUser = null;

        window.onload = function () {
            const saved = sessionStorage.getItem('driverUser');
            if (!saved) { window.location.href = 'driver-login.html'; return; }
            driverUser = JSON.parse(saved);
            document.getElementById('driverName').textContent = '👤 ' + driverUser.name;
            // Set active status button
            document.querySelectorAll('.status-opt').forEach(b => b.classList.remove('active'));
            const activeBtn = document.querySelector(`.status-opt.${driverUser.status || 'available'}`);
            if (activeBtn) activeBtn.classList.add('active');
            loadRides();
            loadHistory();
            loadStats();
            // Auto-refresh every 15s
            setInterval(() => {
                loadRides();
                loadStats();
            }, 15000);
        };

        async function loadStats() {
            try {
                const res = await fetch(`/driver/stats/${driverUser.id}`);
                const data = await res.json();
                if (data.success && data.stats) {
                    const rating = parseFloat(data.stats.rating || 5).toFixed(1);
                    document.getElementById('statRating').textContent = rating;
                    document.getElementById('statTrips').textContent = data.stats.total_trips || 0;
                    document.getElementById('statEarnings').textContent = '₹' + (data.stats.total_earnings || 0);
                }
            } catch (e) {
                console.error("Failed to load stats", e);
            }
        }

        function driverLogout() {
            sessionStorage.removeItem('driverUser');
            window.location.href = 'driver-login.html';
        }

        async function setDriverStatus(status) {
            try {
                await fetch(`/driver/status/${driverUser.id}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status })
                });
                driverUser.status = status;
                sessionStorage.setItem('driverUser', JSON.stringify(driverUser));
                document.querySelectorAll('.status-opt').forEach(b => b.classList.remove('active'));
                document.querySelector(`.status-opt.${status}`).classList.add('active');
            } catch (e) { alert('Failed to update status'); }
        }

        async function loadRides() {
            try {
                const res = await fetch(`/driver/rides/${driverUser.id}`);
                const data = await res.json();
                if (!data.success) return;

                const myRides = data.rides.filter(r => r.assigned_driver_id == driverUser.id);
                const available = data.rides.filter(r => !r.assigned_driver_id || r.assigned_driver_id != driverUser.id);

                document.getElementById('statAvailable').textContent = available.length;
                document.getElementById('statActive').textContent = myRides.length;

                // Available rides
                const avGrid = document.getElementById('availableRides');
                if (available.length === 0) {
                    avGrid.innerHTML = '<div class="dd-empty"><div class="icon">📭</div><p>No rides available right now</p></div>';
                } else {
                    avGrid.innerHTML = available.map(r => rideCard(r, false)).join('');
                }

                // My active rides
                const myGrid = document.getElementById('myActiveRides');
                if (myRides.length === 0) {
                    myGrid.innerHTML = '<div class="dd-empty"><div class="icon">📭</div><p>No active rides</p></div>';
                } else {
                    myGrid.innerHTML = myRides.map(r => rideCard(r, true)).join('');
                }
            } catch (e) {
                document.getElementById('availableRides').innerHTML = '<div class="dd-empty"><div class="icon">⚠️</div><p>Failed to load rides</p></div>';
            }
        }

        async function loadHistory() {
            try {
                const res = await fetch(`/driver/history/${driverUser.id}`);
                const data = await res.json();
                const grid = document.getElementById('rideHistory');
                if (!data.success || !data.rides || data.rides.length === 0) {
                    grid.innerHTML = '<div class="dd-empty"><div class="icon">📭</div><p>No ride history yet</p></div>';
                if (document.getElementById('statCompleted')) {
                    document.getElementById('statCompleted').textContent = '0';
                }
                if (document.getElementById('statTrips')) {
                    document.getElementById('statTrips').textContent = '0';
                }
                return;
            }
            // Count total trips and today's completed
            const today = new Date().toDateString();
            const totalTrips = data.rides.filter(r => r.status === 'completed').length;
            const todayCount = data.rides.filter(r => r.status === 'completed' && new Date(r.created_at).toDateString() === today).length;
            
            if (document.getElementById('statTrips')) {
                document.getElementById('statTrips').textContent = totalTrips;
            }
            if (document.getElementById('statCompleted')) {
                document.getElementById('statCompleted').textContent = todayCount;
            }

                grid.innerHTML = data.rides.slice(0, 10).map(r => `
                    <div class="ride-card history-card">
                        <div class="ride-header">
                            <span class="ride-id">#${r.id}</span>
                            <span class="ride-status ${r.status}">${r.status}</span>
                        </div>
                        <div class="ride-info">
                            <div><span class="label">Patient:</span> ${esc(r.patient_name)}</div>
                            <div><span class="label">From:</span> ${esc(r.pickup_location)}</div>
                            <div><span class="label">To:</span> ${esc(r.drop_location)}</div>
                            <div><span class="label">Date:</span> ${formatDate(r.created_at)}</div>
                        </div>
                    </div>
                `).join('');
            } catch (e) {
                document.getElementById('rideHistory').innerHTML = '<div class="dd-empty"><div class="icon">⚠️</div><p>Failed to load history</p></div>';
            }
        }

        function rideCard(r, isMine) {
            const typeColors = { Cardiac: '#e74c3c', Accident: '#e67e22', Pregnancy: '#9b59b6', Respiratory: '#3498db', General: '#2ed573', Other: '#95a5a6' };
            const color = typeColors[r.emergency_type] || '#95a5a6';
            const actions = isMine
                ? `<div class="ride-actions">
                        <a href="/tracking.html?bookingId=${r.id}" class="ride-btn track" target="_blank">🗺️ Track</a>
                        <button class="ride-btn complete" onclick="completeRide(${r.id})">✅ Complete</button>
                   </div>`
                : `<div class="ride-actions">
                        <button class="ride-btn accept" onclick="acceptRide(${r.id})">🚑 Accept Ride</button>
                   </div>`;

            return `
                <div class="ride-card ${isMine ? 'my-ride' : ''}">
                    <div class="ride-header">
                        <span class="ride-id">#${r.id}</span>
                        <span class="ride-type" style="background:${color}22;color:${color};border:1px solid ${color}44">${r.emergency_type}</span>
                    </div>
                    <div class="ride-info">
                        <div><span class="label">👤 Patient:</span> <strong>${esc(r.patient_name)}</strong></div>
                        <div><span class="label">📱 Phone:</span> ${esc(r.phone)}</div>
                        <div><span class="label">📍 Pickup:</span> ${esc(r.pickup_location)}</div>
                        <div><span class="label">🏥 Hospital:</span> ${esc(r.drop_location)}</div>
                        <div><span class="label">🕐 Time:</span> ${formatDate(r.created_at)}</div>
                        ${r.notes ? `<div><span class="label">📝 Notes:</span> ${esc(r.notes)}</div>` : ''}
                    </div>
                    <div class="ride-status-bar"><span class="ride-status ${r.status}">${r.status}</span></div>
                    ${actions}
                </div>`;
        }

        async function acceptRide(bookingId) {
            if (!confirm('Accept this ride?')) return;
            try {
                const res = await fetch(`/driver/rides/${bookingId}/accept`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ driverId: driverUser.id })
                });
                const data = await res.json();
                if (data.success) {
                    setDriverStatus('on_duty');
                    loadRides();
                    alert('🚑 Ride accepted! Check "My Active Rides".');
                } else { alert(data.message || 'Failed to accept ride'); }
            } catch (e) { alert('Network error'); }
        }

        async function completeRide(bookingId) {
            if (!confirm('Mark this ride as completed?')) return;
            try {
                const res = await fetch(`/driver/rides/${bookingId}/complete`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ driverId: driverUser.id })
                });
                const data = await res.json();
                if (data.success) {
                    setDriverStatus('available');
                    loadRides();
                    loadHistory();
                    loadStats();
                    alert('✅ Ride completed!');
                } else { alert(data.message || 'Failed'); }
            } catch (e) { alert('Network error'); }
        }

        function esc(t) { const d = document.createElement('div'); d.textContent = t || ''; return d.innerHTML; }
        function formatDate(s) { return new Date(s).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
