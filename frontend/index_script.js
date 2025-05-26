document.addEventListener("DOMContentLoaded", () => {
    initializeCarousel();
    const token = localStorage.getItem("token")?.trim();
    const menu = document.querySelector("ul.menu");
    menu.querySelectorAll(".auth-link").forEach(link => link.remove());

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

// -------------------- AUTH HEADER BEHAVIOR --------------------
function setupAuthenticatedMenu(menu, token) {
    const tab = document.getElementById("account-tab");
    tab.innerHTML = `
        <div class="dropdown">
            <button class="dropbtn">My Account</button>
            <div class="dropdown-content">
                <a href="account.html">Profile</a>
                <a href="#" id="logout-link">Sign Out</a>
            </div>
        </div>
    `;

    const logoutBtn = document.getElementById("logout-link");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", e => {
            e.preventDefault();
            logoutUser();
        });
    }

    fetchUserProfilePicture(token, menu);
}

function setupUnauthenticatedMenu(menu) {
    const tab = document.getElementById("account-tab");
    tab.innerHTML = `<a href="login.html">Login</a>`;
}

// -------------------- MAP --------------------
async function setupMap() {
    const mapContainer = document.getElementById("race-map");
    if (!mapContainer) return;

    const map = L.map(mapContainer).setView([20, 0], 2);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

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

            if (!isNaN(lat) && !isNaN(lng)) {
                const marker = L.marker([lat, lng], { icon: orangeIcon }).bindPopup(
                    `<strong>${name}</strong><br>${date}<br>${location}`
                );
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

async function fetchUserProfilePicture(token, menu) {
    try {
        const stored = localStorage.getItem("profilePicture");
        const profileImg = document.createElement('img');
        profileImg.classList.add('profile-picture-nav');
        const accountNode = menu.querySelector(".auth-tab");

        if (stored) {
            profileImg.src = stored;
        } else {
            const res = await fetch('https://ultramarathon-finder-backend.onrender.com/api/auth/account', {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            if (res.ok) {
                const { user } = await res.json();
                profileImg.src = user.profilePicture || 'images/default-profile.png';
                localStorage.setItem("profilePicture", user.profilePicture || 'images/default-profile.png');
            }
        }

        profileImg.alt = "Profile Picture";
        accountNode.prepend(profileImg);
    } catch { }
}

function trackUserInactivity() {
    let inactivityTimer;
    const maxInactivityTime = 2 * 60 * 60 * 1000;
    function reset() {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
            logoutUser();
        }, maxInactivityTime);
    }
    ["mousemove", "keydown", "click"].forEach(event =>
        document.addEventListener(event, reset)
    );
    reset();
}

function logoutUser() {
    localStorage.removeItem("token");
    localStorage.removeItem("profilePicture");
    alert("You have been logged out due to inactivity.");
    window.location.href = "login.html";
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
