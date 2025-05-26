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
    loadLatestPosts(); // For recent forum previews
    setupMap(); // ⬅️ Ensure map loads
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

// ----------------------- MAP SETUP -----------------------
async function setupMap() {
    const mapContainer = document.getElementById("race-map");
    if (!mapContainer) return;

    const map = L.map(mapContainer).setView([0, 0], 2);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    const orangeIcon = L.icon({
        iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -25]
    });

    try {
        const response = await fetch("duv_ultramarathons.csv");
        const text = await response.text();
        const rows = text.trim().split("\n").slice(1); // Skip header

        rows.forEach(row => {
            const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            const name = cols[0];
            const date = cols[1];
            const location = cols[2];
            const lat = parseFloat(cols[4]);
            const lng = parseFloat(cols[5]);

            if (!isNaN(lat) && !isNaN(lng)) {
                L.marker([lat, lng], { icon: orangeIcon })
                    .bindPopup(`<strong>${name}</strong><br>${date}<br>${location}`)
                    .addTo(map);
            }
        });
    } catch (err) {
        console.error("Error loading race map:", err);
    }
}

// ----------------------- Other functions (same as before) -----------------------

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
    const logoutBtn = document.getElementById("logout-link");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", e => {
            e.preventDefault();
            logoutUser();
        });
    }
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
        const accountNode = menu.querySelector(".auth-link a[href='account.html']").parentNode;

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
    } catch {}
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

// Forum preview posts (optional)
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
                    <div class="meta"><strong>${post.username || 'Anonymous'}</strong><br>
                    <small>${new Date(post.createdAt).toLocaleString()}</small></div>
                </div>
                <h4>${post.title}</h4>
                <p>${post.message}</p>
                <span class="post-meta">Posted in <strong>${post.topic}</strong></span>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error("Error loading forum posts:", err);
    }
}
