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

        // Draw timeline and visited states
        drawUltraTimelineChart(data);
        drawVisitedStatesOverlay(map, data);

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

// 📈 Draw Race Completion Timeline Chart
function drawUltraTimelineChart(activities) {
    const ultras = activities
        .filter(act => act.distance / 1609.34 >= 26.2)
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

    const labels = ultras.map(act => new Date(act.start_date).toLocaleDateString());
    const data = ultras.map(act => parseFloat((act.distance / 1609.34).toFixed(2)));

    const ctx = document.getElementById("ultraTimelineChart").getContext("2d");

    new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "Ultra Distance (miles)",
                data: data,
                fill: false,
                borderColor: "green",
                tension: 0.3,
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: "Distance (miles)"
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: "Date"
                    }
                }
            }
        }
    });
}

// 🌎 Overlay visited states onto main map
function drawVisitedStatesOverlay(map, activities) {
    const stateAbbrevToFull = {
        AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
        CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
        HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
        KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
        MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
        MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
        NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
        OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
        SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
        VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
        DC: "District of Columbia"
    };

    const visitedStates = new Set();

    activities.forEach(act => {
        if (act.location_country === "United States" && act.location_state) {
            const input = act.location_state.trim();
            const full = stateAbbrevToFull[input] || input; // Handle both abbrev & full names
            visitedStates.add(full);
        }
    });

    fetch("https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json")
        .then(res => res.json())
        .then(geoData => {
            const visitedCount = { count: 0 };

            L.geoJson(geoData, {
                style: feature => {
                    const isVisited = visitedStates.has(feature.properties.name);
                    if (isVisited) visitedCount.count += 1;
                    return {
                        fillColor: isVisited ? "#2ecc71" : "#f0f0f0",
                        weight: 1,
                        color: "white",
                        fillOpacity: 0.7
                    };
                },
                onEachFeature: (feature, layer) => {
                    layer.bindPopup(`<strong>${feature.properties.name}</strong>`);
                }
            }).addTo(map);

            document.getElementById("visited-states-count").textContent = visitedCount.count;
        })
        .catch(err => {
            console.error("❌ Failed to load state overlay:", err);
        });
}
