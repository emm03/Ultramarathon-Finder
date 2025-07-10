// 🚀 Show loading message right away
const loadingMessage = document.createElement("div");
loadingMessage.id = "loading-status";
loadingMessage.innerHTML = `<p style="text-align:center; padding: 40px;">⏳ Loading Ultra Map...</p>`;
document.body.prepend(loadingMessage);

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

        const loadingStatus = document.getElementById("loading-status");
        if (loadingStatus) loadingStatus.remove();
    } catch (err) {
        console.error("❌ Failed to load shared map:", err);
        document.body.innerHTML = `
            <p style="text-align:center; padding: 50px;">
                ❌ Could not load shared Ultra Map for <strong>${username}</strong>.
            </p>`;
    }
});

function renderSharedUltraMap(data) {
    const map = L.map("ultra-map", { scrollWheelZoom: false }).setView([37.8, -96], 4);
    map.scrollWheelZoom.disable();
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    let totalDistance = 0;
    let longestRun = 0;
    let totalElevation = 0;
    const locations = new Set();
    const visitedStates = new Set();
    const photoContainer = document.getElementById("photo-scroll-container");

    const yearCounts = {};

    data.forEach((activity, index) => {
        const {
            name,
            distance,
            moving_time,
            start_date,
            total_elevation_gain,
            start_latlng,
            photos
        } = activity;

        const miles = (distance / 1609.34).toFixed(2);
        totalDistance += parseFloat(miles);
        longestRun = Math.max(longestRun, parseFloat(miles));
        totalElevation += total_elevation_gain || 0;

        const year = new Date(start_date).getFullYear();
        yearCounts[year] = (yearCounts[year] || 0) + 1;

        if (start_latlng?.length === 2) {
            const [lat, lng] = start_latlng;
            locations.add(`${lat.toFixed(2)},${lng.toFixed(2)}`);

            if (window.stateGeoData) {
                window.stateGeoData.features.forEach(feature => {
                    const polygon = feature.geometry;
                    if (isPointInPolygon([lng, lat], polygon)) {
                        visitedStates.add(feature.properties.name);
                    }
                });
            }

            const marker = L.marker([lat, lng]).addTo(map);
            marker.bindPopup(`
                <strong>${name}</strong><br/>
                📏 ${miles} mi<br/>
                🕒 ${(moving_time / 3600).toFixed(2)} hrs<br/>
                ⛰️ ${total_elevation_gain || 0} m<br/>
                📅 ${new Date(start_date).toLocaleDateString()}
            `);
        }

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
    visitedStatesListEl.innerHTML = "";
    Array.from(visitedStates).sort().forEach(state => {
        const li = document.createElement("li");
        li.textContent = state;
        visitedStatesListEl.appendChild(li);
    });

    renderSharedMilestones(data, totalDistance, totalElevation, visitedStates);
    renderTimelineChart(yearCounts);

    const websiteLink = document.createElement("p");
    websiteLink.innerHTML = `Want to build your own Ultra Map? <a href="https://ultramarathonconnect.com/" target="_blank">Join Ultramarathon Connect</a>.`;
    websiteLink.style.textAlign = "center";
    websiteLink.style.marginTop = "60px";
    document.body.appendChild(websiteLink);
}

// GeoJSON state data
window.stateGeoData = null;
fetch("https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json")
    .then(res => res.json())
    .then(data => {
        window.stateGeoData = data;
    });

function isPointInPolygon(point, geometry) {
    if (geometry.type === "Polygon") return inside(point, geometry.coordinates[0]);
    if (geometry.type === "MultiPolygon") return geometry.coordinates.some(p => inside(point, p[0]));
    return false;
}

function inside(point, vs) {
    const [x, y] = point;
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        const [xi, yi] = vs[i];
        const [xj, yj] = vs[j];
        const intersect = ((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function renderSharedMilestones(activities, totalMiles, elevation, visitedStates) {
    const milestoneList = document.getElementById("milestone-list");
    const milestones = [];

    if (activities.length > 0) {
        const oldest = activities.reduce((earliest, act) =>
            new Date(act.start_date) < new Date(earliest.start_date) ? act : earliest, activities[0]);
        const dist = (oldest.distance / 1609.34).toFixed(2) + " mi";
        milestones.push(`🥇 First Ultra Completed: ${oldest.name || "Unnamed Ultra"} (${dist})`);
    }

    for (let m = 100; m <= totalMiles; m += 100) {
        milestones.push(`💯 ${m} Miles Total`);
    }

    const topElevationMilestone = Math.floor(elevation / 1000) * 1000;
    if (topElevationMilestone >= 1000) {
        milestones.push(`⛰️ ${topElevationMilestone.toLocaleString()} ft Climbed`);
    }

    if (visitedStates.size > 0) {
        const states = Array.from(visitedStates).sort().join(", ");
        milestones.push(`📍 States Visited (${visitedStates.size}): ${states}`);
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

function renderTimelineChart(yearCounts) {
    const ctx = document.getElementById("timeline-chart").getContext("2d");
    const labels = Object.keys(yearCounts).sort();
    const values = labels.map(y => yearCounts[y]);

    new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Ultras Completed",
                data: values,
                backgroundColor: "#4caf50"
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });
}