document.addEventListener("DOMContentLoaded", () => {
    initializeCarousel();

    setupMap(); // Initialize Leaflet map


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

    // New additions
    loadLatestPosts();
    setupMap();
});

document.addEventListener("DOMContentLoaded", () => {
    loadLatestPosts(); // Load recent forum posts
    setupMap();        // Load race map
});

// Carousel logic
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

// Auth menu
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
    } catch (error) {
        setupUnauthenticatedUser();
    }
}

function setupUnauthenticatedUser() {
    const usernameElement = document.getElementById("username");
    const emailElement = document.getElementById("email");
    const profilePicElement = document.getElementById("profile-pic");

    usernameElement.textContent = "Welcome, User!";
    emailElement.innerHTML = `<strong>Email:</strong> user@example.com`;
    profilePicElement.src = "images/default-profile.png";
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
        const storedProfilePicture = localStorage.getItem("profilePicture");
        const profileImg = document.createElement('img');
        profileImg.classList.add('profile-picture-nav');
        const accountListItem = menu.querySelector(".auth-link a[href='account.html']").parentNode;

        if (storedProfilePicture) {
            profileImg.src = storedProfilePicture;
            profileImg.alt = "Profile Picture";
            accountListItem.prepend(profileImg);
        } else {
            const response = await fetch('https://ultramarathon-finder-backend.onrender.com/api/auth/account', {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const { user } = await response.json();
                profileImg.src = user.profilePicture || 'images/default-profile.png';
                profileImg.alt = `${user.username}'s Profile Picture`;
                localStorage.setItem("profilePicture", user.profilePicture || "images/default-profile.png");
                accountListItem.prepend(profileImg);
            }
        }
    } catch (error) {
        console.error("Error fetching profile picture:", error);
    }
}

function trackUserInactivity() {
    let inactivityTimer;
    const maxInactivityTime = 2 * 60 * 60 * 1000;

    function resetInactivityTimer() {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
            logoutUser();
        }, maxInactivityTime);
    }

    document.addEventListener("mousemove", resetInactivityTimer);
    document.addEventListener("keydown", resetInactivityTimer);
    document.addEventListener("click", resetInactivityTimer);

    resetInactivityTimer();
}

function logoutUser() {
    localStorage.removeItem("token");
    localStorage.removeItem("profilePicture");
    alert("You have been logged out due to inactivity.");
    window.location.href = "login.html";
}

// -------- NEW: Fetch and display latest forum posts --------
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
    } catch (error) {
        console.error("Error loading latest posts:", error);
    }
}

// -------- NEW: Race Map Setup --------
function setupMap() {
    const mapContainer = document.getElementById("race-map");
    if (!mapContainer) return;

    const map = L.map("race-map").setView([37.773972, -122.431297], 4); // U.S. center

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    // Example marker
    L.marker([37.773972, -122.431297])
        .addTo(map)
        .bindPopup("Example Race in San Francisco")
        .openPopup();
}

// Load and display all races on map from CSV
async function setupMapFromCSV() {
    const mapContainer = document.getElementById('race-map');
    if (!mapContainer) return;

    const map = L.map('race-map').setView([37.0902, -95.7129], 2); // Centered over US
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    try {
        const response = await fetch('duv_ultramarathons.csv');
        const text = await response.text();
        const lines = text.trim().split('\n').slice(1); // Skip header

        for (let line of lines) {
            const [name, date, location, distance] = line.split(',');

            const geocodeResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${location}`);
            const results = await geocodeResponse.json();

            if (results.length > 0) {
                const { lat, lon } = results[0];
                L.marker([lat, lon])
                    .addTo(map)
                    .bindPopup(`<strong>${name}</strong><br>${location}<br>${date} - ${distance}`);
            }
        }
    } catch (err) {
        console.error('Error loading race data for map:', err);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    setupMapFromCSV(); // <-- Load map markers when homepage loads
});
