// ultra_map_script.js

document.addEventListener('DOMContentLoaded', async () => {
    const map = L.map('ultra-map').setView([37.8, -96], 4);

    map.scrollWheelZoom.disable();
    map.getContainer().addEventListener('wheel', function (e) {
        if (e.ctrlKey || e.metaKey) {
            map.scrollWheelZoom.enable();
        } else {
            map.scrollWheelZoom.disable();
        }
    });

    const token = localStorage.getItem('token');
    if (!token) {
        console.warn("⚠️ No token found. User not authenticated.");
        return;
    }

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    try {
        const res = await fetch('/api/strava/ultras', {
            headers: { Authorization: 'Bearer ' + token }
        });

        if (!res.ok) {
            throw new Error(`Server responded with status ${res.status}`);
        }

        const data = await res.json();
        if (!Array.isArray(data)) throw new Error('Invalid data format from backend');

        let totalDistance = 0;
        let longestRun = 0;
        const locations = new Set();

        data.forEach((activity) => {
            const {
                name,
                distance,
                moving_time,
                start_date,
                location_country,
                location_state,
                id,
                total_elevation_gain,
                start_latlng
            } = activity;

            const miles = (distance / 1609.34).toFixed(2);
            totalDistance += parseFloat(miles);
            longestRun = Math.max(longestRun, parseFloat(miles));

            // ✅ Use rounded lat/lng as unique location key
            if (start_latlng && start_latlng.length === 2) {
                const roundedLat = start_latlng[0].toFixed(2);
                const roundedLng = start_latlng[1].toFixed(2);
                locations.add(`${roundedLat},${roundedLng}`);
            }

            const marker = L.marker([
                start_latlng?.[0] || 37.773972,
                start_latlng?.[1] || -122.431297
            ]).addTo(map);

            const popupContent = `
                <strong>${name}</strong><br/>
                📏 ${miles} miles<br/>
                🕒 ${(moving_time / 3600).toFixed(2)} hrs<br/>
                ⛰️ Elevation: ${total_elevation_gain || 0} m<br/>
                📍 ${location_state || 'Unknown'}, ${location_country || ''}<br/>
                📅 ${new Date(start_date).toLocaleDateString()}<br/>
                <a href="https://www.strava.com/activities/${id}" target="_blank">View on Strava</a>
            `;
            marker.bindPopup(popupContent);
        });

        // Update summary stats
        document.getElementById('ultra-count').textContent = data.length;
        document.getElementById('ultra-distance').textContent = totalDistance.toFixed(2) + ' mi';
        document.getElementById('longest-run').textContent = longestRun.toFixed(2) + ' mi';
        document.getElementById('unique-locations').textContent = locations.size;

        // ✅ Save ultra stats globally for Alan AI
        window.alanUltraData = {
            count: data.length,
            distance: totalDistance.toFixed(2),
            longest: longestRun.toFixed(2)
        };

    } catch (err) {
        console.error('❌ Failed to load ultra data:', err.message || err);
    }
});

// 🧠 Ask Alan for suggestions based on user's ultra stats
function askAlanBasedOnMap() {
    const bubble = document.getElementById('alan-bubble');
    const windowBox = document.getElementById('alan-window');

    if (bubble && windowBox && !windowBox.classList.contains('open')) {
        bubble.click();
    }
}