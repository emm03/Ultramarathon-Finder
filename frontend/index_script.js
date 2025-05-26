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

function loadUserInfo(token) {
    fetch("https://ultramarathon-finder-backend.onrender.com/api/auth/account", {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
    })
        .then((res) => res.json())
        .then(({ user }) => {
            document.getElementById("username").textContent = `Welcome, ${user.username}!`;
            document.getElementById("email").innerHTML = `<strong>Email:</strong> ${user.email}`;
            if (user.profilePicture) {
                document.getElementById("profile-pic").src = user.profilePicture;
                localStorage.setItem("profilePicture", user.profilePicture);
            }
        })
        .catch((error) => {
            console.error("Error loading account info:", error);
            setupUnauthenticatedUser();
        });
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

function fetchUserProfilePicture(token, menu) {
    const profileImg = document.createElement("img");
    profileImg.classList.add("profile-picture-nav");
    const accountItem = menu.querySelector(".auth-link a[href='account.html']").parentNode;
    const storedPic = localStorage.getItem("profilePicture");
    if (storedPic) {
        profileImg.src = storedPic;
        accountItem.prepend(profileImg);
        return;
    }
    fetch("https://ultramarathon-finder-backend.onrender.com/api/auth/account", {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    })
        .then((res) => res.json())
        .then(({ user }) => {
            const pic = user.profilePicture || "images/default-profile.png";
            profileImg.src = pic;
            localStorage.setItem("profilePicture", pic);
            accountItem.prepend(profileImg);
        });
}

function logoutUser() {
    localStorage.removeItem("token");
    localStorage.removeItem("profilePicture");
    alert("You have been logged out due to inactivity.");
    window.location.href = "login.html";
}

function trackUserInactivity() {
    let timer;
    const maxInactive = 2 * 60 * 60 * 1000;
    const resetTimer = () => {
        clearTimeout(timer);
        timer = setTimeout(logoutUser, maxInactive);
    };
    ["mousemove", "keydown", "click"].forEach((e) => document.addEventListener(e, resetTimer));
    resetTimer();
}

function loadLatestPosts() {
    fetch("https://ultramarathon-finder-backend.onrender.com/api/forum/posts?limit=3")
        .then((res) => res.json())
        .then((data) => {
            const posts = data.posts || [];
            const container = document.getElementById("forum-preview-list");
            if (!container) return;
            container.innerHTML = "";
            posts.forEach((post) => {
                const card = document.createElement("div");
                card.className = "post-card";
                card.innerHTML = `
            <div class="post-header">
              <img class="avatar" src="${post.profilePicture || './images/default-profile.png'}" alt="Avatar">
              <div class="meta">
                <strong>${post.username || "Anonymous"}</strong><br>
                <small>${new Date(post.createdAt).toLocaleString()}</small>
              </div>
            </div>
            <h4>${post.title}</h4>
            <p>${post.message}</p>
            <span class="post-meta">Posted in <strong>${post.topic}</strong></span>
          `;
                container.appendChild(card);
            });
        });
}

async function setupMap() {
    const mapContainer = document.getElementById("race-map");
    if (!mapContainer) return;

    const map = L.map("race-map").setView([37.8, -96], 2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    try {
        const response = await fetch("duv_ultramarathons.csv");
        const text = await response.text();
        const rows = text.trim().split("\n").slice(1);

        rows.forEach((row) => {
            const cols = row.split(",");
            const raceName = cols[0];
            const lat = parseFloat(cols[4]);
            const lng = parseFloat(cols[5]);

            if (!isNaN(lat) && !isNaN(lng)) {
                L.circleMarker([lat, lng], {
                    radius: 6,
                    fillColor: "#ff6600",
                    color: "#ff6600",
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.9,
                })
                    .bindPopup(`<strong>${raceName}</strong>`)
                    .addTo(map);
            }
        });
    } catch (error) {
        console.error("Error loading map data:", error);
    }
}
