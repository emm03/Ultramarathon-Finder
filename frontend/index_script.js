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

// Fetch and display the user's profile picture in the navigation menu
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
            } else {
                console.error("Failed to fetch profile picture:", await response.text());
            }
        }
    } catch (error) {
        console.error("Error fetching profile picture:", error);
    }
}
