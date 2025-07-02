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

        // ✅ Render photo timeline with clickable thumbnails
        const activitiesWithPhotos = data.filter(act => Array.isArray(act.photos) && act.photos.length > 0);
        console.log("📸 Ultra Activities with Photos:", activitiesWithPhotos);

        const photoContainer = document.getElementById("photo-scroll-container");
        activitiesWithPhotos.forEach((act, index) => {
            act.photos.forEach((url, i) => {
                const img = document.createElement("img");
                img.src = url;
                img.alt = `Ultra ${index + 1} Photo ${i + 1}`;
                img.classList.add("photo-thumb");

                // Lightbox click
                img.addEventListener("click", () => {
                    openLightbox(url);
                });

                photoContainer.appendChild(img);
            });
        });

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

        document.querySelector(".ultra-modal-close").addEventListener("click", closeUltraModal);

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
    const titles = ultras.map(act => act.name || "Untitled Run");

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
                pointRadius: 5,
                hitRadius: 12 // 👈 Makes dots easier to click
            }]
        },
        options: {
            responsive: true,
            layout: {
                padding: {
                    left: 20,
                    right: 20,
                    top: 10,
                    bottom: 30
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const index = context.dataIndex;
                            return [
                                `${titles[index]}`,
                                `${labels[index]} — ${data[index].toFixed(2)} miles`
                            ];
                        }
                    }
                },
                legend: { display: true, position: 'top' }
            },
            onClick: (evt, activeEls) => {
                if (activeEls.length > 0) {
                    const pointIndex = activeEls[0].index;
                    const race = ultras[pointIndex];
                    openUltraModal(race);
                }
            },
            elements: {
                point: {
                    radius: 5,
                    hitRadius: 12 // 👈 Again for extra click buffer
                }
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

function openLightbox(imageUrl) {
    const modal = document.getElementById("photo-lightbox");
    const modalImg = document.getElementById("lightbox-image");

    if (!modal || !modalImg) return;

    modalImg.src = imageUrl;
    modal.style.display = "flex";

    modal.addEventListener("click", () => {
        modal.style.display = "none";
    });
}

function openUltraModal(race) {
    console.log("🧭 Polyline Check:", race.map);
    const modal = document.getElementById("ultra-detail-modal");
    const titleEl = document.getElementById("modal-title");
    const dateEl = document.getElementById("modal-date");
    const distEl = document.getElementById("modal-distance");
    const descEl = document.getElementById("modal-description");
    const photoContainer = document.getElementById("modal-photos");
    const notesBox = document.getElementById("user-notes");
    const polylineMap = document.getElementById("polyline-map");
    polylineMap.innerHTML = "";

    if (race.map && race.map.summary_polyline) {
        try {
            if (L.DomUtil.get("polyline-map")._leaflet_id) {
                L.DomUtil.get("polyline-map")._leaflet_id = null;
            }

            const decoded = polyline.decode(race.map.summary_polyline);

            const modalMap = L.map("polyline-map", {
                scrollWheelZoom: false,
                dragging: true,
                zoomControl: true,
                attributionControl: false
            });

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                maxZoom: 18
            }).addTo(modalMap);

            const path = L.polyline(decoded, {
                color: "#007BFF",
                weight: 4
            }).addTo(modalMap);

            // 🛠 Fix zoom/render timing
            setTimeout(() => {
                modalMap.invalidateSize();
                modalMap.fitBounds(path.getBounds());
            }, 300);
        } catch (err) {
            console.error("❌ Error decoding polyline:", err);
            polylineMap.innerHTML = `<p style="text-align:center; color:#999;">Map failed to render.</p>`;
        }
    } else {
        polylineMap.innerHTML = `<p style="text-align:center; color:#999;">Map unavailable for this activity.</p>`;
    }

    // Fill content
    titleEl.textContent = race.name || "Untitled Ultra";
    dateEl.textContent = `📅 ${new Date(race.start_date).toLocaleDateString()}`;
    distEl.textContent = `📏 ${(race.distance / 1609.34).toFixed(2)} miles`;
    descEl.innerHTML = (race.description || "No description available.")
        .split('\n')
        .map(line => line.trim() !== "" ? `• ${line.trim()}` : "")
        .join('<br>');

    // Photos
    photoContainer.innerHTML = "";
    if (Array.isArray(race.photos)) {
        race.photos.forEach(url => {
            const img = document.createElement("img");
            img.src = url;
            img.className = "carousel-photo";
            photoContainer.appendChild(img);
        });
    }

    // Notes
    const notesKey = `ultra-notes-${race.id}`;
    const savedNotesContainer = document.getElementById("saved-notes");
    let savedNotesRaw = localStorage.getItem(notesKey);
    let savedNotes = [];

    try {
        const parsed = JSON.parse(savedNotesRaw);
        savedNotes = Array.isArray(parsed) ? parsed.filter(n => n !== null) : [parsed];
    } catch {
        if (savedNotesRaw) savedNotes = [savedNotesRaw];
    }

    renderSavedNotes(savedNotes, savedNotesContainer, race.id);
    notesBox.value = "";

    // ✅ Remove old listener and rebind only once
    const saveBtn = document.getElementById("save-notes-btn");
    const newSaveBtn = saveBtn.cloneNode(true); // replace with clean clone
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);

    newSaveBtn.onclick = () => {
        const newNote = notesBox.value.trim();
        if (!newNote) return;
        const updatedNotes = [...savedNotes, newNote];
        localStorage.setItem(notesKey, JSON.stringify(updatedNotes));
        renderSavedNotes(updatedNotes, savedNotesContainer, race.id);
        notesBox.value = "";
    };

    modal.style.display = "flex";
}

function renderSavedNotes(notes, container, raceId) {
    if (!container) {
        console.warn("⚠️ Missing saved notes container in modal.");
        return;
    }

    container.innerHTML = "";
    if (!Array.isArray(notes) || notes.length === 0) return;

    notes.forEach((note, i) => {
        if (!note || typeof note !== "string") return;

        const noteEl = document.createElement("div");
        noteEl.className = "saved-note";
        noteEl.innerHTML = `
            <strong>Note ${i + 1}:</strong><br>${note.split('\n').join('<br>')}
            <button class="delete-note-btn" title="Delete note" style="float:right; background:none; border:none; cursor:pointer;">🗑️</button>
        `;

        const deleteBtn = noteEl.querySelector(".delete-note-btn");
        deleteBtn.onclick = () => {
            const updated = notes.filter((_, idx) => idx !== i);
            localStorage.setItem(`ultra-notes-${raceId}`, JSON.stringify(updated));
            renderSavedNotes(updated, container, raceId);
        };

        container.appendChild(noteEl);
    });
}

function closeUltraModal() {
    document.getElementById("ultra-detail-modal").style.display = "none";
}

document.addEventListener("DOMContentLoaded", function () {
    const btn = document.querySelector('button.green-btn');
    if (btn) {
        btn.addEventListener("click", downloadUltraResume);
    }
});

function downloadUltraResume() {
    const element = document.getElementById("ultra-resume-content");

    // Collect and update résumé stats
    const resumeCount = document.getElementById("resume-ultra-count");
    const resumeDistance = document.getElementById("resume-ultra-distance");
    const resumeLongest = document.getElementById("resume-longest-run");
    const resumeLocations = document.getElementById("resume-unique-locations");
    const resumeStates = document.getElementById("resume-states-count");

    const count = document.getElementById("ultra-count")?.textContent;
    const dist = document.getElementById("ultra-distance")?.textContent;
    const long = document.getElementById("longest-run")?.textContent;
    const locs = document.getElementById("unique-locations")?.textContent;
    const states = document.getElementById("visited-states-count")?.textContent;

    resumeCount.textContent = count;
    resumeDistance.textContent = dist;
    resumeLongest.textContent = long;
    resumeLocations.textContent = locs;
    resumeStates.textContent = states;

    // Add top photo
    const topPhoto = document.querySelector("#photo-scroll-container img");
    const resumePhoto = document.getElementById("resume-photo");
    resumePhoto.innerHTML = "";
    if (topPhoto) {
        const img = document.createElement("img");
        img.src = topPhoto.src;
        img.style.maxWidth = "100%";
        img.style.borderRadius = "8px";
        resumePhoto.appendChild(img);
    }

    // Add race highlights + Alan’s insights
    const highlightsContainer = document.getElementById("resume-race-list");
    highlightsContainer.innerHTML = "";

    const races = document.querySelectorAll(".ultra-dot");
    races.forEach(dot => {
        const title = dot.getAttribute("data-title");
        const date = dot.getAttribute("data-date");
        const desc = dot.getAttribute("data-description") || "";

        if (!title || !date) return;

        const div = document.createElement("div");
        div.style.marginBottom = "10px";

        const titleLine = document.createElement("p");
        titleLine.innerHTML = `<strong>${title}</strong> (${date})`;
        div.appendChild(titleLine);

        if (desc) {
            const tips = generateAlanTipsFromDescription(desc);
            const ul = document.createElement("ul");
            tips.forEach(t => {
                const li = document.createElement("li");
                li.textContent = t;
                ul.appendChild(li);
            });
            div.appendChild(ul);
        }

        highlightsContainer.appendChild(div);
    });

    // ✅ Temporarily show the résumé container for rendering
    element.style.display = "block";

    // ✨ Auto-height, no extra blank pages
    setTimeout(() => {
        html2pdf().set({
            filename: "ultra_resume.pdf",
            margin: 0.5,
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
            pagebreak: { avoid: 'div' }
        }).from(element).save().then(() => {
            element.style.display = "none";
        });
    }, 100);
}

// 🧠 Alan's Tips Generator
function generateAlanTipsFromDescription(desc) {
    const tips = [];

    if (desc.toLowerCase().includes("hill") || desc.toLowerCase().includes("elevation"))
        tips.push("Great climbing effort — consider more hill repeats in training.");
    if (desc.toLowerCase().includes("hot") || desc.toLowerCase().includes("heat"))
        tips.push("Excellent heat management. Stay hydrated and train with electrolytes.");
    if (desc.toLowerCase().includes("tough") || desc.toLowerCase().includes("hard"))
        tips.push("Impressive grit. You’re building mental endurance.");
    if (desc.toLowerCase().includes("first ultra"))
        tips.push("Congratulations on your first ultra finish! The journey has begun.");
    if (desc.toLowerCase().includes("mud") || desc.toLowerCase().includes("trail"))
        tips.push("Great trail effort — watch foot placement and use poles if needed.");

    if (tips.length === 0)
        tips.push("Solid performance! Keep building on your strengths.");

    return tips;
}