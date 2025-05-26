document.addEventListener("DOMContentLoaded", () => {
    initializeCarousel();
    setupMap();
    loadLatestPosts();
  
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
  });
  
  // Carousel
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
  
  // Map Setup for All Ultramarathon Races
  async function setupMap() {
    const mapContainer = document.getElementById("race-map");
    if (!mapContainer) return;
  
    const map = L.map("race-map").setView([20, 0], 2.1);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
  
    try {
      const response = await fetch("duv_ultramarathons.csv");
      const text = await response.text();
      const rows = text.split("\n").slice(1); // Skip header row
  
      rows.forEach((row) => {
        const cols = row.split(",");
        if (cols.length < 7) return;
  
        const race = cols[0].trim();
        const date = cols[1]?.trim();
        const lat = parseFloat(cols[4]);
        const lng = parseFloat(cols[5]);
  
        if (!isNaN(lat) && !isNaN(lng)) {
          L.circleMarker([lat, lng], {
            radius: 6,
            color: "#ff6600",
            fillColor: "#ff6600",
            fillOpacity: 0.85,
            weight: 1
          })
            .addTo(map)
            .bindPopup(`<strong>${race}</strong><br>${date}`);
        }
      });
    } catch (err) {
      console.error("Failed to load races:", err);
    }
  }
  
  // Latest Forum Posts
  async function loadLatestPosts() {
    try {
      const res = await fetch("https://ultramarathon-finder-backend.onrender.com/api/forum/posts?limit=3");
      const data = await res.json();
      const posts = data.posts || data;
      const container = document.getElementById("forum-preview-list");
      if (!container) return;
      container.innerHTML = "";
      posts.forEach((post) => {
        const card = document.createElement("div");
        card.className = "post-card";
        card.innerHTML = `
          <div class="post-header">
            <img class="avatar" src="${post.profilePicture || "./images/default-profile.png"}" alt="Avatar">
            <div class="meta">
              <strong>${post.username || "Anonymous"}</strong><br>
              <small>${new Date(post.createdAt).toLocaleString()}</small>
            </div>
          </div>
          <h4>${post.title}</h4>
          <p>${post.message}</p>
          <span class="post-meta">Posted in <strong>${post.topic}</strong></span>`;
        container.appendChild(card);
      });
    } catch (err) {
      console.error("Error loading posts:", err);
    }
  }
  
  // Authentication helpers
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
    const usernameEl = document.getElementById("username");
    const emailEl = document.getElementById("email");
    const picEl = document.getElementById("profile-pic");
  
    fetch("https://ultramarathon-finder-backend.onrender.com/api/auth/account", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then(({ user }) => {
        usernameEl.textContent = `Welcome, ${user.username}!`;
        emailEl.innerHTML = `<strong>Email:</strong> ${user.email}`;
        if (user.profilePicture) {
          picEl.src = user.profilePicture;
          localStorage.setItem("profilePicture", user.profilePicture);
        }
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setupUnauthenticatedUser();
      });
  }
  
  function setupUnauthenticatedUser() {
    document.getElementById("username").textContent = "Welcome, User!";
    document.getElementById("email").innerHTML = `<strong>Email:</strong> user@example.com`;
    document.getElementById("profile-pic").src = "images/default-profile.png";
  }
  
  function fetchUserProfilePicture(token, menu) {
    const stored = localStorage.getItem("profilePicture");
    const profileImg = document.createElement("img");
    profileImg.classList.add("profile-picture-nav");
    const accountItem = menu.querySelector(".auth-link a[href='account.html']").parentNode;
  
    if (stored) {
      profileImg.src = stored;
      accountItem.prepend(profileImg);
    } else {
      fetch("https://ultramarathon-finder-backend.onrender.com/api/auth/account", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then(({ user }) => {
          const src = user.profilePicture || "images/default-profile.png";
          localStorage.setItem("profilePicture", src);
          profileImg.src = src;
          accountItem.prepend(profileImg);
        });
    }
  }
  
  function redirectIfUnauthorized(token, protectedPages) {
    const current = window.location.pathname.split("/").pop();
    if (protectedPages.includes(current) && !token) {
      alert("You must be logged in to view this page.");
      window.location.href = "login.html";
    }
  }
  
  function trackUserInactivity() {
    let timer;
    const max = 2 * 60 * 60 * 1000;
    function reset() {
      clearTimeout(timer);
      timer = setTimeout(() => logoutUser(), max);
    }
    ["mousemove", "keydown", "click"].forEach((evt) =>
      document.addEventListener(evt, reset)
    );
    reset();
  }
  
  function logoutUser() {
    localStorage.removeItem("token");
    localStorage.removeItem("profilePicture");
    alert("You have been logged out.");
    window.location.href = "login.html";
  }
  