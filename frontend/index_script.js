document.addEventListener("DOMContentLoaded", () => {
    initializeCarousel();

    redirectIfUnauthorized(localStorage.getItem("token"), ["account.html", "profile_edit.html"]);
    loadLatestPosts();
    setupMap();

    // Hamburger toggle – only active on mobile
    const toggle = document.querySelector('.menu-toggle');
    const menuList = document.querySelector('.menu');
    if (toggle && menuList) {
        toggle.addEventListener('click', () => {
            menuList.classList.toggle('show');
            document.body.classList.toggle('menu-open');
        });
    }

    // 🌐 Ultra Map display logic based on token + stravaConnected
    if (window.location.pathname.includes("ultra_map.html")) {
        const token = localStorage.getItem("token");
        const mapContainer = document.getElementById("ultra-map-container");
        const message = document.getElementById("connection-check-message");

        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const isConnected = payload.stravaConnected;

                if (isConnected) {
                    mapContainer.style.display = "block";
                } else {
                    message.style.display = "block";
                }
            } catch (err) {
                console.error("❌ Invalid token", err);
                message.style.display = "block";
            }
        } else {
            message.style.display = "block";
        }
    }
});

function initializeCarousel() {
    const slides = document.querySelectorAll(".carousel-item");
    let currentIndex = 0;

    function showSlide(index) {
        slides.forEach((slide, i) => {
            slide.classList.remove("active");
            slide.style.opacity = i === index ? "1" : "0";
            slide.style.zIndex = i === index ? "10" : "0";
        });
    }

    setInterval(() => {
        currentIndex = (currentIndex + 1) % slides.length;
        showSlide(currentIndex);
    }, 5000);
    showSlide(currentIndex);
}

// -------------------- MAP --------------------
async function setupMap() {
    const mapContainer = document.getElementById("race-map");
    if (!mapContainer) return;

    const map = L.map(mapContainer, {
        scrollWheelZoom: false
    }).setView([20, 0], 2);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    const zoomHint = document.createElement("div");
    zoomHint.textContent = "Use ⌘ + scroll to zoom the map";
    Object.assign(zoomHint.style, {
        position: "absolute",
        top: "10px",
        left: "10px",
        padding: "6px 12px",
        background: "rgba(0, 0, 0, 0.7)",
        color: "white",
        borderRadius: "5px",
        fontSize: "0.85rem",
        zIndex: "1000",
        display: "none"
    });
    mapContainer.appendChild(zoomHint);

    map.getContainer().addEventListener("wheel", function (e) {
        if (!e.metaKey && !e.ctrlKey) {
            zoomHint.style.display = "block";
            setTimeout(() => zoomHint.style.display = "none", 1800);
        }

        if ((e.metaKey || e.ctrlKey) && !map.scrollWheelZoom.enabled()) {
            map.scrollWheelZoom.enable();
            setTimeout(() => map.scrollWheelZoom.disable(), 1500);
        }
    });

    const orangeIcon = L.icon({
        iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -25]
    });

    const markerCluster = L.markerClusterGroup();

    try {
        const response = await fetch("duv_ultramarathons.csv");
        const text = await response.text();
        const rows = text.trim().split("\n").slice(1);

        rows.forEach(row => {
            const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            const name = cols[0]?.replace(/^"|"$/g, "");
            const date = cols[1];
            const location = cols[2];
            const lat = parseFloat(cols[4]);
            const lng = parseFloat(cols[5]);
            const url = cols[7]?.replace(/^"|"$/g, "").trim();

            if (!isNaN(lat) && !isNaN(lng)) {
                const popupContent = `
                    <strong>${name}</strong><br>${date}<br>${location}
                    ${url ? `<br><a href="${url}" target="_blank" style="color: orange;">Official Site</a>` : ""}
                `;
                const marker = L.marker([lat, lng], { icon: orangeIcon }).bindPopup(popupContent);
                markerCluster.addLayer(marker);
            }
        });

        map.addLayer(markerCluster);
    } catch (err) {
        console.error("Error loading race map:", err);
    }
}

// -------------------- USER HANDLING --------------------
async function loadUserInfo(token) {
    const usernameElement = document.getElementById("username");
    const emailElement = document.getElementById("email");
    const profilePicElement = document.getElementById("profile-pic");

    try {
        const response = await fetch('https://ultramarathon-finder-backend.onrender.com/api/auth/account', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (response.ok) {
            const { user } = await response.json();
            usernameElement.textContent = `Welcome, ${user.username}!`;
            emailElement.innerHTML = `<strong>Email:</strong> ${user.email}`;

            if (user.profilePicture) {
                profilePicElement.src = user.profilePicture;
                profilePicElement.alt = `${user.username}'s Profile Picture`;
                localStorage.setItem("profilePicture", user.profilePicture);
            }
        } else {
            setupUnauthenticatedUser();
        }
    } catch {
        setupUnauthenticatedUser();
    }
}

function setupUnauthenticatedUser() {
    const usernameElement = document.getElementById("username");
    const emailElement = document.getElementById("email");
    const profilePicElement = document.getElementById("profile-pic");

    if (usernameElement) usernameElement.textContent = "Welcome, User!";
    if (emailElement) emailElement.innerHTML = `<strong>Email:</strong> user@example.com`;
    if (profilePicElement) profilePicElement.src = "images/default-profile.png";
}

function redirectIfUnauthorized(token, restrictedPages) {
    const currentPage = window.location.pathname.split("/").pop();
    if (restrictedPages.includes(currentPage) && !token) {
        alert("You must be logged in to view this page.");
        window.location.href = "login.html";
    }
}

// -------------------- FORUM PREVIEW --------------------
async function loadLatestPosts() {
    try {
        const response = await fetch("https://ultramarathon-finder-backend.onrender.com/api/forum/posts?limit=3");
        const data = await response.json();
        const posts = data.posts || data;
        const container = document.getElementById("forum-preview-list");
        if (!container) return;

        container.innerHTML = '';
        posts.forEach(post => {
            const card = document.createElement("div");
            card.className = "post-card";
            card.innerHTML =
                `<div class="post-header">
                    <img class="avatar" src="${post.profilePicture || './images/default-profile.png'}" alt="Avatar">
                    <div class="meta"><strong>${post.username || 'Anonymous'}</strong><br>
                    <small>${new Date(post.createdAt).toLocaleString()}</small></div>
                </div>
                <h4>${post.title}</h4>
                <p>${post.message}</p>
                <span class="post-meta">Posted in <strong>${post.topic}</strong></span>`;
            container.appendChild(card);
        });
    } catch (err) {
        console.error("Error loading forum posts:", err);
    }
}

// -------------------- ARTICLE CAROUSEL SCROLL --------------------
function scrollCarousel(direction) {
    const carousel = document.getElementById('articleCarousel');
    if (!carousel) return;

    const scrollAmount = 300;
    carousel.scrollBy({
        left: scrollAmount * direction,
        behavior: 'smooth'
    });
}