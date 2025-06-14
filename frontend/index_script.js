document.addEventListener("DOMContentLoaded", () => {
    initializeCarousel();

    const token = localStorage.getItem("token")?.trim();
    const menu = document.querySelector("ul.menu");
    menu.querySelectorAll(".auth-link").forEach(link => link.remove());

    // Inactivity check
    const lastActive = localStorage.getItem("lastActive");
    const now = Date.now();

    if (token && lastActive && now - parseInt(lastActive) > 2 * 60 * 60 * 1000) {
        logoutUser(true);
        return;
    }

    localStorage.setItem("lastActive", now.toString());

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

    // Hamburger toggle – only active on mobile
    const toggle = document.querySelector('.menu-toggle');
    const menuList = document.querySelector('.menu');
    if (toggle && menuList) {
        toggle.addEventListener('click', () => {
            menuList.classList.toggle('show');
            document.body.classList.toggle('menu-open');
        });
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

// -------------------- AUTH HEADER BEHAVIOR --------------------
function setupAuthenticatedMenu(menu, token) {
    const tab = document.getElementById("account-tab");

    fetch('https://ultramarathon-finder-backend.onrender.com/api/auth/account', {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        }
    })
        .then(res => res.json())
        .then(data => {
            const username = data.user?.username || 'User';
            const profilePic = data.user?.profilePicture || 'images/default-profile.png';
            localStorage.setItem("profilePicture", profilePic);

            tab.innerHTML = `
                <div class="account-hover-container">
                    <div class="account-dropdown">
                        <img src="${profilePic}" alt="Profile Picture" class="profile-picture-nav" />
                        <span>${username}'s Account Info</span>
                    </div>
                    <div class="dropdown-content">
                        <a href="account.html">Profile</a>
                        <a href="training_log.html">Training Log</a>
                        <a href="#" id="logout-link">Sign Out</a>
                    </div>
                </div>
            `;

            const dropdown = tab.querySelector('.dropdown-content');
            const container = tab.querySelector('.account-hover-container');

            // Mobile: tap to toggle open/close
            let dropdownVisible = false;
            container.addEventListener('click', (e) => {
                if (window.innerWidth < 769) {
                    e.stopPropagation();
                    dropdownVisible = !dropdownVisible;
                    dropdown.style.display = dropdownVisible ? 'block' : 'none';
                }
            });

            // Close dropdown if tapped outside (mobile)
            document.addEventListener('click', (e) => {
                if (window.innerWidth < 769 && !tab.contains(e.target)) {
                    dropdown.style.display = 'none';
                    dropdownVisible = false;
                }
            });

            const logoutBtn = document.getElementById("logout-link");
            if (logoutBtn) {
                logoutBtn.addEventListener("click", e => {
                    e.preventDefault();
                    logoutUser(false);
                });
            }
        })
        .catch(err => {
            console.error("Failed to load user for account tab:", err);
        });
}

function setupUnauthenticatedMenu(menu) {
    const tab = document.getElementById("account-tab");
    tab.innerHTML = `<a href="login.html" class="orange-signin-btn">Sign In</a>`;
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
        localStorage.setItem("lastActive", Date.now().toString());
        inactivityTimer = setTimeout(() => {
            logoutUser(true);
        }, maxInactivityTime);
    }

    ["mousemove", "keydown", "click"].forEach(event =>
        document.addEventListener(event, reset)
    );

    reset();
}

function logoutUser(fromInactivity = false) {
    localStorage.removeItem("token");
    localStorage.removeItem("profilePicture");

    if (fromInactivity) {
        alert("You have been logged out due to inactivity.");
    }

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
