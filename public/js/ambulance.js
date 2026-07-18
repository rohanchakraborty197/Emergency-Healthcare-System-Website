        let fleetData = [];
        let liveMap = null;
        let mapMarkers = [];

        window.onload = function () { loadFleetData(); loadBookings(); loadDrivers(); };

        // ===== HERO STATS =====
        function updateHeroStats() {
            const t = fleetData.length, a = fleetData.filter(x => x.status === 'available').length, o = fleetData.filter(x => x.status === 'on-duty').length;
            animateCounter('heroTotal', t); animateCounter('heroAvailable', a); animateCounter('heroOnDuty', o);
            fetch('/admin/stats').then(r => r.json()).then(d => { if (d.success) animateCounter('heroCompleted', d.stats.completed || 0); }).catch(() => { document.getElementById('heroCompleted').textContent = '0'; });
        }

        function animateCounter(id, target) {
            const el = document.getElementById(id); let c = 0; const s = Math.max(Math.ceil(target / 20), 1);
            const t = setInterval(() => { c += s; if (c >= target) { c = target; clearInterval(t); } el.textContent = c; }, 40);
        }

        // ===== LOAD FLEET FROM DB =====
        async function loadFleetData() {
            const grid = document.getElementById('fleetGrid');
            try {
                const res = await fetch('/ambulances');
                const data = await res.json();
                if (data.success) {
                    fleetData = data.ambulances;
                    document.getElementById('fleetCount').textContent = fleetData.length;
                    if (fleetData.length === 0) {
                        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px;color:rgba(255,255,255,0.4);"><div style="font-size:3em;margin-bottom:12px;">🚑</div><p>No ambulances yet. Click <strong>➕ Add Ambulance</strong> to get started.</p></div>';
                    } else {
                        grid.innerHTML = fleetData.map(amb => `
                            <div class="ambulance-card">
                                <div class="amb-card-header">
                                    <div class="amb-card-id">
                                        <div class="icon">🚑</div>
                                        <div><div class="id-text">${esc(amb.vehicle_id)}</div><div class="id-plate">${esc(amb.plate_number)}</div></div>
                                    </div>
                                    <span class="amb-status ${amb.status}">${(amb.status || '').replace('-', ' ')}</span>
                                </div>
                                <div class="amb-card-details">
                                    <div class="amb-detail"><span class="label">Type</span><span class="value">${esc(amb.equipment || amb.ambulance_type)}</span></div>
                                    <div class="amb-detail"><span class="label">Driver</span><span class="value">${esc(amb.driver_name || '—')}</span></div>
                                    <div class="amb-detail"><span class="label">Area</span><span class="value">${esc(amb.area || '—')}</span></div>
                                    <div class="amb-detail"><span class="label">Unit</span><span class="value">${esc(amb.ambulance_type)}</span></div>
                                </div>
                                <div class="amb-card-footer">
                                    ${amb.status === 'available' ? `<button class="amb-btn dispatch-btn" onclick="dispatchAmbulance('${amb.vehicle_id}')">🚨 Dispatch</button>` : ''}
                                    ${amb.status === 'on-duty' ? `<button class="amb-btn track-btn" onclick="trackAmbulance('${amb.vehicle_id}')">🗺️ Track</button>` : ''}
                                    <button class="amb-btn details-btn" onclick="editAmbulance(${amb.id})">✏️ Edit</button>
                                    <button class="amb-btn details-btn" style="color:#ff4757;border-color:rgba(255,71,87,0.3);" onclick="deleteAmbulance(${amb.id})">🗑️</button>
                                </div>
                            </div>
                        `).join('');
                    }
                    updateHeroStats();
                }
            } catch (err) {
                grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px;color:rgba(255,255,255,0.4);"><p>⚠️ Failed to load fleet</p></div>';
            }
        }

        // ===== AMBULANCE ADD/EDIT MODAL =====
        const eqMap = { 'ALS': 'Advanced Life Support', 'BLS': 'Basic Life Support', 'PALS': 'Pediatric ALS', 'MICU': 'Mobile ICU' };

        function autoFillEquipment() { document.getElementById('ambEquipment').value = eqMap[document.getElementById('ambType').value] || ''; }

        function openAmbulanceModal() {
            document.getElementById('ambEditId').value = '';
            document.getElementById('ambModalTitle').textContent = '➕ Add Ambulance';
            ['ambVehicleId', 'ambPlate', 'ambDriver', 'ambDriverPhone', 'ambArea', 'ambEquipment'].forEach(id => document.getElementById(id).value = '');
            document.getElementById('ambType').value = 'BLS';
            document.getElementById('ambStatus').value = 'available';
            document.getElementById('ambMsg').className = 'form-msg'; document.getElementById('ambMsg').innerHTML = '';
            document.getElementById('ambSubmitBtn').disabled = false;
            autoFillEquipment();
            document.getElementById('ambulanceModal').classList.add('show');
            document.body.style.overflow = 'hidden';
        }

        function closeAmbulanceModal() {
            document.getElementById('ambulanceModal').classList.remove('show');
            document.body.style.overflow = '';
        }

        function editAmbulance(id) {
            const amb = fleetData.find(a => a.id === id);
            if (!amb) return;
            document.getElementById('ambEditId').value = amb.id;
            document.getElementById('ambModalTitle').textContent = '✏️ Edit Ambulance';
            document.getElementById('ambVehicleId').value = amb.vehicle_id;
            document.getElementById('ambPlate').value = amb.plate_number;
            document.getElementById('ambType').value = amb.ambulance_type || 'BLS';
            document.getElementById('ambEquipment').value = amb.equipment || '';
            document.getElementById('ambDriver').value = amb.driver_name || '';
            document.getElementById('ambDriverPhone').value = amb.driver_phone || '';
            document.getElementById('ambStatus').value = amb.status || 'available';
            document.getElementById('ambArea').value = amb.area || '';
            document.getElementById('ambMsg').className = 'form-msg'; document.getElementById('ambMsg').innerHTML = '';
            document.getElementById('ambSubmitBtn').disabled = false;
            document.getElementById('ambulanceModal').classList.add('show');
            document.body.style.overflow = 'hidden';
        }

        async function saveAmbulance() {
            const vid = document.getElementById('ambVehicleId').value.trim();
            const plate = document.getElementById('ambPlate').value.trim();
            const msg = document.getElementById('ambMsg');
            if (!vid || !plate) { msg.className = 'form-msg error'; msg.innerHTML = '⚠️ Vehicle ID and Plate Number are required'; return; }

            const btn = document.getElementById('ambSubmitBtn'); btn.disabled = true; btn.textContent = 'Saving...';
            const editId = document.getElementById('ambEditId').value;
            const payload = {
                vehicle_id: vid, plate_number: plate,
                ambulance_type: document.getElementById('ambType').value,
                equipment: document.getElementById('ambEquipment').value.trim() || eqMap[document.getElementById('ambType').value],
                driver_name: document.getElementById('ambDriver').value.trim(),
                driver_phone: document.getElementById('ambDriverPhone').value.trim(),
                status: document.getElementById('ambStatus').value,
                area: document.getElementById('ambArea').value.trim()
            };

            try {
                const url = editId ? `/ambulances/${editId}` : '/ambulances';
                const method = editId ? 'PUT' : 'POST';
                const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                const data = await res.json();
                if (data.success) {
                    msg.className = 'form-msg success'; msg.innerHTML = '✅ ' + data.message;
                    loadFleetData();
                    setTimeout(() => closeAmbulanceModal(), 1500);
                } else {
                    msg.className = 'form-msg error'; msg.innerHTML = '❌ ' + data.message;
                    btn.disabled = false; btn.textContent = '🚑 Save Ambulance';
                }
            } catch (err) {
                msg.className = 'form-msg error'; msg.innerHTML = '❌ Network error';
                btn.disabled = false; btn.textContent = '🚑 Save Ambulance';
            }
        }

        async function deleteAmbulance(id) {
            const amb = fleetData.find(a => a.id === id);
            const vid = amb ? amb.vehicle_id : '#' + id;
            if (!confirm(`Delete ambulance ${vid}? This cannot be undone.`)) return;
            try {
                const res = await fetch(`/ambulances/${id}`, { method: 'DELETE' });
                const data = await res.json();
                if (data.success) { alert('🗑️ Ambulance deleted'); loadFleetData(); }
                else alert(data.message || 'Delete failed');
            } catch (err) { alert('Error deleting ambulance'); }
        }

        // ===== LOAD BOOKINGS =====
        async function loadBookings() {
            const tbody = document.getElementById('emergencyTable');
            try {
                const res = await fetch('/admin/bookings'); const data = await res.json();
                if (data.success && data.bookings.length > 0) {
                    const active = data.bookings.filter(b => b.status !== 'completed' && b.status !== 'cancelled');
                    document.getElementById('emergencyCount').textContent = active.length;
                    tbody.innerHTML = data.bookings.slice(0, 20).map(b => {
                        let actions = '';
                        if (b.status === 'pending') {
                            actions = `<button class="table-action-btn dispatch" onclick="updateBookingStatus(${b.id},'dispatched')">🚑 Dispatch</button>
                                       <button class="table-action-btn" style="background:rgba(127,140,141,0.15);color:#95a5a6;" onclick="updateBookingStatus(${b.id},'cancelled')">✖ Cancel</button>`;
                        } else if (b.status === 'dispatched') {
                            actions = `<a href="/tracking.html?bookingId=${b.id}" target="_blank" class="table-action-btn view">🗺️ Track</a>
                                       <button class="table-action-btn" style="background:rgba(46,213,115,0.15);color:#2ed573;" onclick="updateBookingStatus(${b.id},'completed')">✅ Complete</button>
                                       <button class="table-action-btn" style="background:rgba(127,140,141,0.15);color:#95a5a6;" onclick="updateBookingStatus(${b.id},'cancelled')">✖ Cancel</button>`;
                        } else if (b.status === 'completed') {
                            actions = `<span style="color:#2ed573;font-size:0.8em;font-weight:600;">✅ Done</span>`;
                        } else if (b.status === 'cancelled') {
                            actions = `<span style="color:#95a5a6;font-size:0.8em;font-weight:600;">✖ Cancelled</span>
                                       <button class="table-action-btn dispatch" onclick="updateBookingStatus(${b.id},'dispatched')">↩ Reopen</button>`;
                        }
                        return `<tr>
                            <td class="em-id">#${b.id}</td><td>${esc(b.patient_name)}</td><td>${esc(b.phone)}</td>
                            <td>${esc(b.pickup_location)}</td><td>${esc(b.drop_location)}</td>
                            <td><span class="em-type ${(b.emergency_type || '').toLowerCase()}">${b.emergency_type}</span></td>
                            <td><span class="em-status ${b.status}">${b.status}</span></td><td>${formatDate(b.created_at)}</td>
                            <td>${actions}</td>
                        </tr>`;
                    }).join('');
                } else { document.getElementById('emergencyCount').textContent = '0'; tbody.innerHTML = '<tr><td colspan="9" class="empty-row"><div class="empty-icon">📭</div><p>No bookings</p></td></tr>'; }
            } catch (err) { tbody.innerHTML = '<tr><td colspan="9" class="empty-row"><div class="empty-icon">⚠️</div><p>Failed to load</p></td></tr>'; }
        }

        // ===== UPDATE BOOKING STATUS =====
        async function updateBookingStatus(bookingId, newStatus) {
            const labels = { dispatched: 'Dispatch', completed: 'Complete', cancelled: 'Cancel' };
            if (!confirm(`${labels[newStatus] || newStatus} booking #${bookingId}?`)) return;
            try {
                const res = await fetch(`/admin/bookings/${bookingId}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus })
                });
                const data = await res.json();
                if (data.success) {
                    loadBookings();
                    updateHeroStats();
                } else {
                    alert('❌ ' + (data.message || 'Failed to update status'));
                }
            } catch (err) { alert('❌ Network error'); }
        }

        // ===== BOOKING MODAL =====
        function openBookingModal() { document.getElementById('bookingModal').classList.add('show'); document.body.style.overflow = 'hidden'; }
        function closeBookingModal() { document.getElementById('bookingModal').classList.remove('show'); document.body.style.overflow = ''; resetBookingForm(); }
        function resetBookingForm() {
            ['bkPatientName', 'bkPhone', 'bkPickup', 'bkDrop', 'bkNotes'].forEach(id => document.getElementById(id).value = '');
            document.getElementById('bkType').selectedIndex = 0;
            const m = document.getElementById('bookingMsg'); m.className = 'form-msg'; m.innerHTML = '';
            document.getElementById('bookingSubmitBtn').disabled = false; document.getElementById('bookingFormFields').style.display = 'block';
        }

        async function submitBooking() {
            const name = document.getElementById('bkPatientName').value.trim(), phone = document.getElementById('bkPhone').value.trim();
            const pickup = document.getElementById('bkPickup').value.trim(), drop = document.getElementById('bkDrop').value.trim();
            const type = document.getElementById('bkType').value, notes = document.getElementById('bkNotes').value.trim(), msg = document.getElementById('bookingMsg');
            if (!name || !phone || !pickup || !drop || !type) { msg.className = 'form-msg error'; msg.innerHTML = '⚠️ Fill all required fields'; return; }
            const btn = document.getElementById('bookingSubmitBtn'); btn.disabled = true; btn.textContent = 'Dispatching...';
            try {
                const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
                const res = await fetch('/book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id || null, patientName: name, phone, pickupLocation: pickup, dropLocation: drop, emergencyType: type, notes }) });
                const data = await res.json();
                if (data.success) { msg.className = 'form-msg success'; msg.innerHTML = `✅ Dispatched! ID: <strong>#${data.bookingId}</strong>`; document.getElementById('bookingFormFields').style.display = 'none'; loadBookings(); updateHeroStats(); setTimeout(() => closeBookingModal(), 3000); }
                else { msg.className = 'form-msg error'; msg.innerHTML = '❌ ' + (data.message || 'Failed'); btn.disabled = false; btn.textContent = '🚑 Dispatch Ambulance Now'; }
            } catch (err) { msg.className = 'form-msg error'; msg.innerHTML = '❌ Network error'; btn.disabled = false; btn.textContent = '🚑 Dispatch Ambulance Now'; }
        }

        async function quickDispatch(bookingId) {
            if (!confirm('Dispatch ambulance for booking #' + bookingId + '?')) return;
            try {
                const res = await fetch(`/tracking/start/${bookingId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' } }); const data = await res.json();
                if (data.success) { alert('🚑 Dispatched!'); loadBookings(); window.open(`/tracking.html?bookingId=${bookingId}`, '_blank'); } else alert(data.message || 'Failed');
            } catch (err) { alert('Error dispatching'); }
        }

        function dispatchAmbulance(ambId) { openBookingModal(); }
        function trackAmbulance(ambId) { alert('🗺️ Opening tracking for ' + ambId); }

        function activateMap() {
            document.getElementById('mapPlaceholder').style.display = 'none';
            var mapDiv = document.getElementById('liveMap');
            mapDiv.style.display = 'block';
            if (!liveMap) {
                liveMap = L.map('liveMap').setView([22.5726, 88.3639], 12);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '\u00a9 OpenStreetMap', maxZoom: 19
                }).addTo(liveMap);
            }
            setTimeout(function() { liveMap.invalidateSize(); updateMapMarkers(); }, 300);
        }

        function updateMapMarkers() {
            if (!liveMap) return;
            mapMarkers.forEach(function(m) { liveMap.removeLayer(m); });
            mapMarkers = [];
            var base = [22.5726, 88.3639];
            fleetData.forEach(function(amb) {
                var lat = base[0] + (Math.random() * 0.06 - 0.03);
                var lng = base[1] + (Math.random() * 0.06 - 0.03);
                var colors = { available: '#2ed573', 'on-duty': '#e74c3c', maintenance: '#ffa502' };
                var color = colors[amb.status] || '#95a5a6';
                var icon = L.divIcon({
                    className: '',
                    html: '<div style="background:' + color + ';color:#fff;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4);">\ud83d\ude91</div>',
                    iconSize: [36, 36], iconAnchor: [18, 18]
                });
                var marker = L.marker([lat, lng], { icon: icon }).addTo(liveMap);
                marker.bindPopup('<b>' + (amb.vehicle_id||'') + '</b><br><span style="color:' + color + ';font-weight:600;text-transform:uppercase;font-size:0.8em;">' + (amb.status||'') + '</span><br>Driver: ' + (amb.driver_name||'\u2014') + '<br>Area: ' + (amb.area||'\u2014') + '<br>Type: ' + (amb.ambulance_type||''));
                mapMarkers.push(marker);
            });
            if (mapMarkers.length > 0) {
                var group = L.featureGroup(mapMarkers);
                liveMap.fitBounds(group.getBounds().pad(0.2));
            }
        }

        function scrollToFleet() { document.getElementById('fleetSection').scrollIntoView({ behavior: 'smooth' }); }
        function scrollToEmergencies() { document.getElementById('emergenciesSection').scrollIntoView({ behavior: 'smooth' }); }
        function scrollToMap() { document.getElementById('mapSection').scrollIntoView({ behavior: 'smooth' }); }
        function scrollToDrivers() { document.getElementById('driversSection').scrollIntoView({ behavior: 'smooth' }); }

        // ===== LOAD DRIVERS =====
        async function loadDrivers() {
            const tbody = document.getElementById('driversTable');
            try {
                const res = await fetch('/admin/drivers');
                const data = await res.json();
                if (data.success && data.drivers.length > 0) {
                    document.getElementById('driverCount').textContent = data.drivers.length;
                    tbody.innerHTML = data.drivers.map(d => {
                        const statusColors = { available: '#2ed573', on_duty: '#e74c3c', offline: '#95a5a6' };
                        const color = statusColors[d.status] || '#95a5a6';
                        return `<tr>
                            <td class="em-id">#${d.id}</td>
                            <td><strong>${esc(d.name)}</strong></td>
                            <td>${esc(d.email)}</td>
                            <td>${esc(d.phone || '—')}</td>
                            <td>${esc(d.license_number || '—')}</td>
                            <td><span class="em-status" style="background:${color}22;color:${color};border:1px solid ${color}44">${(d.status || 'unknown').replace('_',' ')}</span></td>
                            <td>${formatDate(d.created_at)}</td>
                        </tr>`;
                    }).join('');
                } else {
                    document.getElementById('driverCount').textContent = '0';
                    tbody.innerHTML = '<tr><td colspan="7" class="empty-row"><div class="empty-icon">📭</div><p>No drivers registered yet</p></td></tr>';
                }
            } catch (err) {
                tbody.innerHTML = '<tr><td colspan="7" class="empty-row"><div class="empty-icon">⚠️</div><p>Failed to load drivers</p></td></tr>';
            }
        }

        function esc(t) { const d = document.createElement('div'); d.textContent = t || ''; return d.innerHTML; }
        function formatDate(s) { return new Date(s).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }

        document.getElementById('bookingModal').addEventListener('click', function (e) { if (e.target === this) closeBookingModal(); });
        document.getElementById('ambulanceModal').addEventListener('click', function (e) { if (e.target === this) closeAmbulanceModal(); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeBookingModal(); closeAmbulanceModal(); } });
