        // ===== TRACKING STATE =====
        let map = null;
        let ambulanceMarker = null;
        let pickupMarker = null;
        let dropMarker = null;
        let routeLine = null;
        let dropRouteLine = null;
        let socket = null;
        let bookingId = null;
        let trackingData = null;
        let currentPhase = 'to_pickup';

        // ===== INIT =====
        document.addEventListener('DOMContentLoaded', () => {
            const params = new URLSearchParams(window.location.search);
            bookingId = params.get('bookingId') || params.get('id');

            if (!bookingId) {
                showError('No booking ID provided. Please go back and click "Track Ambulance" from your booking.');
                return;
            }

            document.getElementById('trackBookingId').textContent = `#${bookingId}`;
            initMap();
            initTracking();
        });

        // ===== INITIALIZE MAP =====
        function initMap() {
            map = L.map('trackingMap', {
                zoomControl: true,
                attributionControl: false
            }).setView([22.5726, 88.3639], 13);

            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                maxZoom: 20,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            }).addTo(map);
        }

        // ===== CUSTOM MARKERS =====
        function createAmbulanceIcon() {
            return L.divIcon({
                html: `
                    <div class="ambulance-marker">
                        <div class="ambulance-pulse"></div>
                        <div class="ambulance-marker-inner">🚑</div>
                    </div>
                `,
                className: '',
                iconSize: [44, 44],
                iconAnchor: [22, 22]
            });
        }

        function createPickupIcon() {
            return L.divIcon({
                html: `<div class="pickup-marker">📍</div>`,
                className: '',
                iconSize: [36, 36],
                iconAnchor: [18, 18]
            });
        }

        function createDropIcon() {
            return L.divIcon({
                html: `<div class="drop-marker">🏥</div>`,
                className: '',
                iconSize: [36, 36],
                iconAnchor: [18, 18]
            });
        }

        // ===== INIT TRACKING =====
        async function initTracking() {
            try {
                const res = await fetch(`/tracking/${bookingId}`);
                const data = await res.json();

                if (!data.success) {
                    showError(data.message || 'Tracking data not available for this booking.');
                    return;
                }

                trackingData = data.tracking;
                currentPhase = trackingData.phase || 'to_pickup';

                populateDetails(data.booking);
                setupRoute(trackingData);
                connectSocket();

                document.getElementById('loadingState').classList.add('hidden');

            } catch (err) {
                console.error('Tracking init error:', err);
                showError('Failed to connect to tracking service. Please check your connection and try again.');
            }
        }

        // ===== POPULATE BOOKING DETAILS =====
        function populateDetails(booking) {
            if (!booking) return;
            document.getElementById('detailPatient').textContent = booking.patient_name || '--';
            document.getElementById('detailPhone').textContent = booking.phone || '--';
            document.getElementById('detailPickup').textContent = booking.pickup_location || '--';
            document.getElementById('detailDrop').textContent = booking.drop_location || '--';
            document.getElementById('detailEmergency').textContent = booking.emergency_type || '--';
        }

        // ===== SETUP ROUTE ON MAP =====
        function setupRoute(tracking) {
            const { ambulance_lat, ambulance_lng, pickup_lat, pickup_lng, drop_lat, drop_lng, route_coords, drop_route_coords, status, progress, phase } = tracking;

            // Add pickup marker
            pickupMarker = L.marker([pickup_lat, pickup_lng], { icon: createPickupIcon() })
                .addTo(map)
                .bindPopup('<strong>📍 Pickup Location</strong>');

            // Add hospital/drop marker if coordinates exist
            if (drop_lat && drop_lng) {
                dropMarker = L.marker([drop_lat, drop_lng], { icon: createDropIcon() })
                    .addTo(map)
                    .bindPopup('<strong>🏥 Hospital (Drop)</strong>');
            }

            // Add ambulance marker
            ambulanceMarker = L.marker([ambulance_lat, ambulance_lng], { icon: createAmbulanceIcon() })
                .addTo(map)
                .bindPopup('<strong>🚑 Ambulance</strong>');

            // Draw pickup route
            if (route_coords && route_coords.length > 0) {
                routeLine = L.polyline(route_coords, {
                    color: '#00e5ff',
                    weight: 5,
                    opacity: 0.85,
                    dashArray: '12, 8',
                    lineCap: 'round'
                }).addTo(map);
            }

            // Draw hospital drop route (dimmed if phase 1)
            if (drop_route_coords && drop_route_coords.length > 0) {
                dropRouteLine = L.polyline(drop_route_coords, {
                    color: '#c084fc',
                    weight: 5,
                    opacity: phase === 'to_hospital' ? 0.9 : 0.2,
                    dashArray: '8, 12',
                    lineCap: 'round'
                }).addTo(map);
            }

            // Fit map to all markers
            const allPoints = [[ambulance_lat, ambulance_lng], [pickup_lat, pickup_lng]];
            if (drop_lat && drop_lng) allPoints.push([drop_lat, drop_lng]);
            const bounds = L.latLngBounds(allPoints);
            if (routeLine) bounds.extend(routeLine.getBounds());
            if (dropRouteLine) bounds.extend(dropRouteLine.getBounds());
            map.fitBounds(bounds, { padding: [50, 50] });

            // Update UI with current state
            updateProgress(progress || 0);
            updateStatus(status || 'dispatched');
            updateTimeline(status || 'dispatched');
            updatePhaseIndicator(phase || 'to_pickup', status);
        }

        // ===== SOCKET.IO CONNECTION =====
        function connectSocket() {
            socket = io();

            socket.on('connect', () => {
                console.log('✅ Socket connected');
                socket.emit('join-tracking', bookingId);
            });

            socket.on('location-update', (data) => {
                if (ambulanceMarker) {
                    animateMarker(ambulanceMarker, [data.lat, data.lng]);
                }
                updateProgress(data.progress);
                updateETA(data.eta_seconds);
                if (data.status) {
                    updateStatus(data.status);
                    updateTimeline(data.status);
                }
                if (data.phase) {
                    currentPhase = data.phase;
                    updatePhaseIndicator(data.phase, data.status);
                }
            });

            // Phase 1 complete: arrived at pickup
            socket.on('ambulance-arrived-pickup', (data) => {
                updateProgress(100);
                updateStatus('arrived');
                updateTimeline('arrived');
                updateETA(0);

                setTimeout(() => {
                    document.getElementById('pickupArrivedOverlay').classList.add('visible');
                }, 500);

                const badge = document.getElementById('liveBadge');
                badge.style.background = '#2ed573';
                badge.innerHTML = '<span class="dot"></span> AT PICKUP';
            });

            // Phase change: starting hospital drop
            socket.on('phase-change', (data) => {
                currentPhase = data.phase;

                if (data.phase === 'to_hospital') {
                    // Close pickup overlay if open
                    document.getElementById('pickupArrivedOverlay').classList.remove('visible');

                    // Highlight hospital route
                    if (dropRouteLine) {
                        dropRouteLine.setStyle({ opacity: 0.8, weight: 5, dashArray: '10, 10' });
                    }
                    // Dim pickup route
                    if (routeLine) {
                        routeLine.setStyle({ opacity: 0.2, weight: 2 });
                    }

                    // Update badge
                    const badge = document.getElementById('liveBadge');
                    badge.style.background = '#a855f7';
                    badge.innerHTML = '<span class="dot"></span> TO HOSPITAL';

                    // Update ETA label
                    document.getElementById('etaLabel').textContent = 'ETA to Hospital';
                    document.getElementById('progressLabel').textContent = 'Hospital Route Progress';

                    // Reset progress
                    updateProgress(0);
                    updateStatus('dropping');
                    updateTimeline('dropping');
                    updatePhaseIndicator('to_hospital', 'dropping');

                    // Fit map to drop route
                    if (data.drop_lat && data.drop_lng && dropRouteLine) {
                        const bounds = dropRouteLine.getBounds();
                        map.fitBounds(bounds, { padding: [50, 50] });
                    }
                }
            });

            // Phase 2 complete: arrived at hospital
            socket.on('ambulance-arrived-hospital', (data) => {
                updateProgress(100);
                updateStatus('completed');
                updateTimeline('completed');
                updateETA(0);
                updatePhaseIndicator('to_hospital', 'completed');

                setTimeout(() => {
                    document.getElementById('hospitalArrivedOverlay').classList.add('visible');
                }, 500);

                const badge = document.getElementById('liveBadge');
                badge.style.background = '#2ed573';
                badge.style.animation = 'none';
                badge.innerHTML = '🏥 DELIVERED';

                document.getElementById('etaSubtitle').textContent = 'Patient safely delivered to hospital!';
            });

            // Legacy support for old events
            socket.on('ambulance-arrived', () => {
                updateProgress(100);
                updateStatus('arrived');
                updateTimeline('arrived');
                updateETA(0);
                setTimeout(() => {
                    document.getElementById('pickupArrivedOverlay').classList.add('visible');
                }, 500);
            });

            socket.on('tracking-cancelled', (data) => {
                const badge = document.getElementById('liveBadge');
                badge.style.background = '#95a5a6';
                badge.style.animation = 'none';
                badge.innerHTML = '⛔ CANCELLED';

                const statusBadge = document.getElementById('trackStatus');
                statusBadge.className = 'status-badge';
                statusBadge.style.background = 'rgba(149,165,166,0.15)';
                statusBadge.style.color = '#95a5a6';
                statusBadge.style.border = '1px solid rgba(149,165,166,0.3)';
                statusBadge.textContent = 'Cancelled';

                document.getElementById('etaValue').textContent = '--:--';
                document.getElementById('etaSubtitle').textContent = 'Booking has been cancelled';

                showError(data.message || 'This booking has been cancelled. Tracking has stopped.');
            });

            socket.on('disconnect', () => {
                console.log('⚠️ Socket disconnected');
            });
        }

        // ===== ANIMATE MARKER MOVEMENT =====
        function animateMarker(marker, newLatLng, duration = 1500) {
            const start = marker.getLatLng();
            const end = L.latLng(newLatLng);
            const startTime = Date.now();

            function animate() {
                const elapsed = Date.now() - startTime;
                const t = Math.min(elapsed / duration, 1);
                const ease = 1 - Math.pow(1 - t, 3);
                const lat = start.lat + (end.lat - start.lat) * ease;
                const lng = start.lng + (end.lng - start.lng) * ease;
                marker.setLatLng([lat, lng]);
                if (t < 1) {
                    requestAnimationFrame(animate);
                }
            }
            requestAnimationFrame(animate);
        }

        // ===== UPDATE PROGRESS =====
        function updateProgress(percent) {
            const p = Math.min(Math.max(percent, 0), 100).toFixed(0);
            document.getElementById('progressFill').style.width = p + '%';
            document.getElementById('progressPercent').textContent = p + '%';
        }

        // ===== UPDATE ETA =====
        function updateETA(seconds) {
            const etaEl = document.getElementById('etaValue');
            const subtitleEl = document.getElementById('etaSubtitle');

            if (seconds <= 0) {
                etaEl.textContent = '00:00';
                if (currentPhase === 'to_hospital') {
                    subtitleEl.textContent = 'Arrived at hospital!';
                } else {
                    subtitleEl.textContent = 'Ambulance has arrived at pickup!';
                }
                return;
            }

            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            etaEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

            if (mins > 1) {
                subtitleEl.textContent = `Approximately ${mins} minutes away`;
            } else if (mins === 1) {
                subtitleEl.textContent = 'Almost there — about 1 minute away';
            } else {
                subtitleEl.textContent = 'Arriving any moment now!';
            }
        }

        // ===== UPDATE STATUS BADGE =====
        function updateStatus(status) {
            const badge = document.getElementById('trackStatus');
            const labels = {
                'pending': 'Pending',
                'dispatched': 'Dispatched',
                'en_route': 'En Route',
                'arrived': 'At Pickup',
                'dropping': 'To Hospital',
                'completed': 'Delivered'
            };
            badge.className = `status-badge ${status}`;
            badge.textContent = labels[status] || status;
        }

        // ===== UPDATE PHASE INDICATOR =====
        function updatePhaseIndicator(phase, status) {
            const p1 = document.getElementById('phase1Indicator');
            const p2 = document.getElementById('phase2Indicator');
            const connector = document.getElementById('phaseConnector');

            if (phase === 'to_hospital' || status === 'dropping' || status === 'completed') {
                p1.className = 'phase-step completed';
                p1.querySelector('.phase-dot').textContent = '✓';
                connector.className = 'phase-connector active';
                p2.className = status === 'completed' ? 'phase-step completed' : 'phase-step active';
                if (status === 'completed') p2.querySelector('.phase-dot').textContent = '✓';
            } else {
                p1.className = 'phase-step active';
                p1.querySelector('.phase-dot').textContent = '1';
                connector.className = 'phase-connector';
                p2.className = 'phase-step';
                p2.querySelector('.phase-dot').textContent = '2';
            }
        }

        // ===== UPDATE TIMELINE =====
        function updateTimeline(currentStatus) {
            const steps = ['booked', 'dispatched', 'enroute', 'arrived', 'dropping', 'completed'];
            const statusMap = {
                'pending': 0,
                'dispatched': 1,
                'en_route': 2,
                'arrived': 3,
                'dropping': 4,
                'completed': 5
            };

            const currentIdx = statusMap[currentStatus] ?? 0;
            const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

            steps.forEach((step, idx) => {
                const item = document.getElementById(`tl-${step}`);
                if (!item) return;
                const icon = item.querySelector('.timeline-icon');
                const line = item.querySelector('.timeline-line');
                const timeEl = item.querySelector('.timeline-time');

                if (idx < currentIdx) {
                    icon.className = 'timeline-icon completed';
                    icon.textContent = '✓';
                    if (line) line.className = 'timeline-line completed';
                    item.className = 'timeline-item';
                    if (timeEl.textContent === 'Waiting...') timeEl.textContent = now;
                } else if (idx === currentIdx) {
                    icon.className = 'timeline-icon active';
                    icon.textContent = '●';
                    if (line) line.className = 'timeline-line active';
                    item.className = 'timeline-item active';
                    timeEl.textContent = now;
                } else {
                    icon.className = 'timeline-icon pending';
                    icon.textContent = idx + 1;
                    if (line) line.className = 'timeline-line pending';
                    item.className = 'timeline-item pending-state';
                    timeEl.textContent = 'Waiting...';
                }
            });
        }

        // ===== SHOW ERROR =====
        function showError(msg) {
            document.getElementById('loadingState').classList.add('hidden');
            document.getElementById('errorMessage').textContent = msg;
            document.getElementById('errorState').classList.add('visible');
        }
