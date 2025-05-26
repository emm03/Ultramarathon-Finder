document.addEventListener("DOMContentLoaded", () => {
    initializeCarousel();
    const token = localStorage.getItem("token")?.trim();
    const menu = document.querySelector("ul.menu");
    menu.querySelectorAll(".auth-link").forEach((link) => link.remove());

    if (token) {
        setupAuthenticatedMenu(menu, token);
        loadUserInfo(token);
        trackUserInactivity();
    } else {
        setupUnauthenticatedMenu(menu);
        setupUnauthenticatedUser();
    }

    redirectIfUnauthorized(token, ["account.html", "profile_edit.html"]);
    loadLatestPosts();
    setupMap();
});

// === Carousel ===
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

// === Auth ===
function setupAuthenticatedMenu(menu, token) {
    const accountLink = document.createElement("li");
    accountLink.classList.add("auth-link");
    accountLink.innerHTML = `<a href="account.html">My Account</a>`;

    const logoutLink = document.createElement("li");
    logoutLink.classList.add("auth-link");
    logoutLink.innerHTML = `<a id="logout-link" href="#">Logout</a>`;

    menu.appendChild(accountLink);
    menu.appendChild(logoutLink);
    fetchUserProfilePicture(token, menu);

    document.getElementById("logout-link").addEventListener("click", (e) => {
        e.preventDefault();
        logoutUser();
    });
}

function setupUnauthenticatedMenu(menu) {
    const loginLink = document.createElement("li");
    loginLink.classList.add("auth-link");
    loginLink.innerHTML = `<a href="login.html">Login</a>`;

    const registerLink = document.createElement("li");
    registerLink.classList.add("auth-link");
    registerLink.innerHTML = `<a href="register.html">Register</a>`;

    menu.appendChild(loginLink);
    menu.appendChild(registerLink);
}

function setupUnauthenticatedUser() {
    document.getElementById("username").textContent = "Welcome, User!";
    document.getElementById("email").innerHTML = `<strong>Email:</strong> user@example.com`;
    document.getElementById("profile-pic").src = "images/default-profile.png";
}

function redirectIfUnauthorized(token, restrictedPages) {
    const currentPage = window.location.pathname.split("/").pop();
    if (restrictedPages.includes(currentPage) && !token) {
        alert("You must be logged in to view this page.");
        window.location.href = "login.html";
    }
}

async function fetchUserProfilePicture(token, menu) {
    try {
        const stored = localStorage.getItem("profilePicture");
        const profileImg = document.createElement("img");
        profileImg.classList.add("profile-picture-nav");

        const listItem = menu.querySelector(".auth-link a[href='account.html']").parentNode;
        if (stored) {
            profileImg.src = stored;
        } else {
            const res = await fetch("https://ultramarathon-finder-backend.onrender.com/api/auth/account", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const { user } = await res.json();
            profileImg.src = user.profilePicture || "images/default-profile.png";
            localStorage.setItem("profilePicture", profileImg.src);
        }
        listItem.prepend(profileImg);
    } catch (err) {
        console.error("Error fetching profile picture:", err);
    }
}

function trackUserInactivity() {
    let timeout;
    const maxTime = 2 * 60 * 60 * 1000;
    const reset = () => {
        clearTimeout(timeout);
        timeout = setTimeout(logoutUser, maxTime);
    };
    document.addEventListener("mousemove", reset);
    document.addEventListener("keydown", reset);
    document.addEventListener("click", reset);
    reset();
}

function logoutUser() {
    localStorage.removeItem("token");
    localStorage.removeItem("profilePicture");
    alert("You have been logged out due to inactivity.");
    window.location.href = "login.html";
}

// === Forum Preview ===
async function loadLatestPosts() {
    try {
        const res = await fetch("https://ultramarathon-finder-backend.onrender.com/api/forum/posts?limit=3");
        const data = await res.json();
        const posts = data.posts || data;

        const container = document.getElementById("forum-preview-list");
        if (!container) return;
        container.innerHTML = '';

        posts.forEach(post => {
            const card = document.createElement("div");
            card.className = "post-card";
            card.innerHTML = `
                <div class="post-header">
                    <img class="avatar" src="${post.profilePicture || './images/default-profile.png'}" alt="Avatar">
                    <div class="meta">
                        <strong>${post.username || 'Anonymous'}</strong><br>
                        <small>${new Date(post.createdAt).toLocaleString()}</small>
                    </div>
                </div>
                <h4>${post.title}</h4>
                <p>${post.message}</p>
                <span class="post-meta">Posted in <strong>${post.topic}</strong></span>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error("Error loading latest posts:", err);
    }
}

// === Map ===
async function setupMap() {
    const mapContainer = document.getElementById("race-map");
    if (!mapContainer) return;

    const map = L.map("race-map").setView([20, 0], 2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const orangeIcon = new L.Icon({
        iconUrl: 'https://chart.googleapis.com/chart?chst=d_map_pin_icon&chld=flag|ff6f00',
        iconSize: [30, 48],
        iconAnchor: [15, 48],
        popupAnchor: [0, -40],
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
        shadowSize: [41, 41]
    });

    try {
        const res = await fetch("duv_ultramarathons.csv");
        const text = await res.text();
        const lines = text.split("\n").slice(1); // skip header

        lines.forEach(row => {
            const cols = row.split(",");
            const raceName = cols[0];
            const date = cols[1];
            const location = cols[2];
            const lat = parseFloat(cols[4]);
            const lng = parseFloat(cols[5]);

            if (!isNaN(lat) && !isNaN(lng)) {
                const marker = L.marker([lat, lng], { icon: orangeIcon }).addTo(map);
                marker.bindPopup(`<strong>${raceName}</strong><br>${location}<br>${date}`);
            }
        });
    } catch (err) {
        console.error("Failed to load map data:", err);
    }
}
