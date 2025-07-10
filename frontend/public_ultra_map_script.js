document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get("user");

    if (!username) {
        document.body.innerHTML = "<p style='text-align:center; padding: 50px;'>❌ Invalid link. No user specified.</p>";
        return;
    }

    document.getElementById("shared-username").textContent = username;

    try {
        const res = await fetch(`/api/public-ultras/${username}`);
        if (!res.ok) throw new Error("Could not fetch shared ultra map");

        const activities = await res.json();
        renderSharedUltraMap(activities);
    } catch (err) {
        console.error("❌ Failed to load shared map:", err);
        document.body.innerHTML = `
            <p style="text-align:center; padding: 50px;">
                ❌ Could not load shared Ultra Map for <strong>${username}</strong>.
            </p>`;
    }
});

function renderSharedUltraMap(data) {
    const map = L.map("ultra-map").setView([37.8, -96], 4);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    let totalDistance = 0;
    let longestRun = 0;
    let totalElevation = 0;
    const locations = new Set();
    const visitedStates = new Set();

    const photoContainer = document.getElementById("photo-scroll-container");

    data.forEach((activity, index) => {
        const {
            name,
            distance,
            moving_time,
            start_date,
            id,
            total_elevation_gain,
            start_latlng,
            photos
        } = activity;

        const miles = (distance / 1609.34).toFixed(2);
        totalDistance += parseFloat(miles);
        longestRun = Math.max(longestRun, parseFloat(miles));
        totalElevation += total_elevation_gain || 0;

        if (start_latlng && start_latlng.length === 2) {
            const [lat, lng] = start_latlng;
            const rounded = `${lat.toFixed(2)},${lng.toFixed(2)}`;
            locations.add(rounded);

            // Determine visited states (if geo data available)
            if (window.stateGeoData) {
                window.stateGeoData.features.forEach(feature => {
                    const polygon = feature.geometry;
                    if (isPointInPolygon([lng, lat], polygon)) {
                        visitedStates.add(feature.properties.name);
                    }
                });
            }
        }

        // Add marker
        const marker = L.marker([
            start_latlng?.[0] || 37.773972,
            start_latlng?.[1] || -122.431297
        ]).addTo(map);

        marker.bindPopup(`
            <strong>${name}</strong><br/>
            📏 ${miles} mi<br/>
            🕒 ${(moving_time / 3600).toFixed(2)} hrs<br/>
            ⛰️ ${total_elevation_gain || 0} m<br/>
            📅 ${new Date(start_date).toLocaleDateString()}
        `);

        // Add photos
        if (Array.isArray(photos)) {
            photos.forEach((url, i) => {
                const img = document.createElement("img");
                img.src = url;
                img.alt = `Ultra ${index + 1} Photo ${i + 1}`;
                img.classList.add("photo-thumb");
                photoContainer.appendChild(img);
            });
        }
    });

    document.getElementById("ultra-count").textContent = data.length;
    document.getElementById("ultra-distance").textContent = totalDistance.toFixed(2) + " mi";
    document.getElementById("longest-run").textContent = longestRun.toFixed(2) + " mi";
    document.getElementById("total-elevation").textContent = totalElevation.toLocaleString() + " ft";
    document.getElementById("unique-locations").textContent = locations.size;
    document.getElementById("visited-states-count").textContent = visitedStates.size;

    const visitedStatesListEl = document.getElementById("visited-states-list");
    if (visitedStatesListEl) {
        visitedStatesListEl.innerHTML = "";
        Array.from(visitedStates).sort().forEach(state => {
            const li = document.createElement("li");
            li.textContent = state;
            visitedStatesListEl.appendChild(li);
        });
    }

    renderSharedMilestones(data, totalDistance, totalElevation, visitedStates);
}

// Load geoJSON state data
window.stateGeoData = null;
fetch("https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json")
    .then(res => res.json())
    .then(data => {
        window.stateGeoData = data;
    });

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

function renderSharedMilestones(activities, totalMiles, elevation, visitedStates) {
    const milestoneList = document.getElementById("milestone-list");
    const milestones = [];

    // First ultra
    if (activities.length > 0) {
        const oldest = activities.reduce((earliest, act) => {
            return new Date(act.start_date) < new Date(earliest.start_date) ? act : earliest;
        }, activities[0]);

        const name = oldest.name || "Unnamed Ultra";
        const dist = (oldest.distance / 1609.34).toFixed(2) + " mi";
        milestones.push(`🥇 First Ultra Completed: ${name} (${dist})`);
    }

    // Distance milestones
    for (let m = 100; m <= totalMiles; m += 100) {
        milestones.push(`💯 ${m} Miles Total`);
    }

    // Elevation milestone
    const topElevationMilestone = Math.floor(elevation / 1000) * 1000;
    if (topElevationMilestone >= 1000) {
        milestones.push(`⛰️ ${topElevationMilestone.toLocaleString()} ft Climbed`);
    }

    // State count
    const states = Array.from(visitedStates).sort();
    if (states.length > 0) {
        milestones.push(`📍 States Visited (${states.length}): ${states.join(", ")}`);
    }

    milestoneList.innerHTML = "";
    if (milestones.length === 0) {
        milestoneList.innerHTML = `<li>🔜 Keep running ultras to unlock milestones!</li>`;
    } else {
        milestones.forEach(m => {
            const li = document.createElement("li");
            li.textContent = m;
            milestoneList.appendChild(li);
        });
    }
}