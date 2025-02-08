document.addEventListener("DOMContentLoaded", () => {
    // Initialize carousel
    initializeCarousel();

    // Authentication logic
    const token = localStorage.getItem("token")?.trim();
    const menu = document.querySelector("ul.menu");

    // Clear existing dynamic links
    menu.querySelectorAll(".auth-link").forEach((link) => link.remove());

    if (token) {
        setupAuthenticatedMenu(menu, token);
    } else {
        setupUnauthenticatedMenu(menu);
    }

    // Redirect users to login if accessing restricted pages
    redirectIfUnauthorized(token, ["account.html", "profile_edit.html"]);
});

// Function to initialize the carousel
function initializeCarousel() {
    const slides = document.querySelectorAll(".carousel-item");
    let currentIndex = 0;

    function showSlide(index) {
        slides.forEach((slide, i) => {
            slide.classList.remove("active");
            slide.style.opacity = i === index ? "1" : "0"; // Smooth fade effect
            slide.style.zIndex = i === index ? "10" : "0";
        });
    }

    // Automatically advance slides every 5 seconds
    setInterval(() => {
        currentIndex = (currentIndex + 1) % slides.length;
        showSlide(currentIndex);
    }, 5000);

    // Initialize the first slide
    showSlide(currentIndex);
}

// Set up authenticated menu (My Account + Logout)
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

    // Logout functionality
    const logoutBtn = document.getElementById("logout-link");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            localStorage.removeItem("token");
            localStorage.removeItem("profilePicture");
            alert("You have successfully logged out.");
            window.location.href = "login.html";
        });
    }
}

// Set up unauthenticated menu (Login + Register)
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

// Redirect unauthorized users from protected pages
function redirectIfUnauthorized(token, restrictedPages) {
    const currentPage = window.location.pathname.split("/").pop();

    if (restrictedPages.includes(currentPage) && !token) {
        alert("You must be logged in to view this page.");
        window.location.href = "login.html";
    }
}

// Fetch and display user info in the profile section
async function loadUserInfo(token) {
    const usernameElement = document.getElementById("username");
    const emailElement = document.getElementById("email");

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
        } else {
            console.error("Failed to fetch user info:", await response.text());
            usernameElement.textContent = "Welcome, User!";
            emailElement.innerHTML = `<strong>Email:</strong> user@example.com`;
        }
    } catch (error) {
        console.error("Error fetching user info:", error);
        usernameElement.textContent = "Welcome, User!";
        emailElement.innerHTML = `<strong>Email:</strong> user@example.com`;
    }
}

// Add this call to load user info if the user is logged in
document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token")?.trim();

    if (token) {
        loadUserInfo(token);
    }
});

