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
                id,
                total_elevation_gain,
                start_latlng
            } = activity;

            const miles = (distance / 1609.34).toFixed(2);
            totalDistance += parseFloat(miles);
            longestRun = Math.max(longestRun, parseFloat(miles));

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
                📅 ${new Date(start_date).toLocaleDateString()}<br/>
                <a href="https://www.strava.com/activities/${id}" target="_blank">View on Strava</a>
            `;
            marker.bindPopup(popupContent);
        });

        document.getElementById('ultra-count').textContent = data.length;
        document.getElementById('ultra-distance').textContent = totalDistance.toFixed(2) + ' mi';
        document.getElementById('longest-run').textContent = longestRun.toFixed(2) + ' mi';
        document.getElementById('unique-locations').textContent = locations.size;

        window.alanUltraData = {
            count: data.length,
            distance: totalDistance.toFixed(2),
            longest: longestRun.toFixed(2)
        };

        drawUltraTimelineChart(data);
        drawVisitedStatesOverlay(map, data);

    } catch (err) {
        console.error('❌ Failed to load ultra data:', err.message || err);
    }
});

// Ask Alan suggestion trigger
function askAlanBasedOnMap() {
    const bubble = document.getElementById('alan-bubble');
    const windowBox = document.getElementById('alan-window');
    if (bubble && windowBox && !windowBox.classList.contains('open')) {
        bubble.click();
    }
}

// Timeline Chart
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
                legend: { display: true, position: 'top' }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    title: { display: true, text: "Distance (miles)" }
                },
                x: {
                    title: { display: true, text: "Date" }
                }
            }
        }
    });
}

// Visited States via lat/lng
function drawVisitedStatesOverlay(map, activities) {
    const visitedStates = new Set();

    fetch("https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json")
        .then(res => res.json())
        .then(geoData => {
            activities.forEach(act => {
                const coords = act.start_latlng;
                if (!coords || coords.length !== 2) return;

                const lat = coords[0];
                const lng = coords[1];

                geoData.features.forEach(feature => {
                    const polygon = feature.geometry;
                    if (isPointInPolygon([lng, lat], polygon)) {
                        visitedStates.add(feature.properties.name.toLowerCase());
                    }
                });
            });

            const visitedCount = { count: 0 };

            L.geoJson(geoData, {
                style: feature => {
                    const name = feature.properties.name.trim().toLowerCase();
                    const isVisited = visitedStates.has(name);
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

// Point-in-Polygon helper
function isPointInPolygon(point, geometry) {
    if (geometry.type === "Polygon") {
        return inside(point, geometry.coordinates[0]);
    } else if (geometry.type === "MultiPolygon") {
        return geometry.coordinates.some(polygon => inside(point, polygon[0]));
    }
    return false;
}

function inside(point, vs) {
    const x = point[0], y = point[1];
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        const xi = vs[i][0], yi = vs[i][1];
        const xj = vs[j][0], yj = vs[j][1];

        const intersect = ((yi > y) !== (yj > y)) &&
            (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}
