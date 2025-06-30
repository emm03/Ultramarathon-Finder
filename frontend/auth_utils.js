// -------------------- Auth Utility --------------------
const MAX_SESSION_TIME = 4 * 60 * 60 * 1000; // 4 hours in ms

document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token")?.trim();
    const lastActive = localStorage.getItem("lastActive");
    const now = Date.now();

    if (token && lastActive && now - parseInt(lastActive) > MAX_SESSION_TIME) {
        logoutSilently();
        return;
    }

    localStorage.setItem("lastActive", now.toString());

    if (token) {
        injectAuthenticatedDropdown(token);
        trackInactivityLogout();
    } else {
        showLoginButton();
    }
});

// -------------------- Auth Dropdown Injection --------------------
function injectAuthenticatedDropdown(token) {
    fetch('https://ultramarathon-finder-backend.onrender.com/api/auth/account', {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        }
    })
        .then(res => res.json())
        .then(data => {
            const username = data.user?.username || "User";
            const profilePic = data.user?.profilePicture || "images/default-profile.png";
            localStorage.setItem("profilePicture", profilePic);

            const tab = document.getElementById("account-tab");
            if (!tab) return;

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

            // Mobile click toggle
            let dropdownVisible = false;
            container.addEventListener('click', (e) => {
                if (window.innerWidth < 769) {
                    e.stopPropagation();
                    dropdownVisible = !dropdownVisible;
                    dropdown.style.display = dropdownVisible ? 'block' : 'none';
                }
            });

            document.addEventListener('click', (e) => {
                if (window.innerWidth < 769 && !tab.contains(e.target)) {
                    dropdown.style.display = 'none';
                    dropdownVisible = false;
                }
            });

            const logoutBtn = document.getElementById("logout-link");
            logoutBtn?.addEventListener("click", (e) => {
                e.preventDefault();
                logoutUser();
            });
        })
        .catch(err => {
            console.error("Failed to load account dropdown:", err);
            logoutSilently();
        });
}

function showLoginButton() {
    const tab = document.getElementById("account-tab");
    if (!tab) return;
    tab.innerHTML = `<a href="login.html" class="orange-signin-btn">Sign In</a>`;
}

// -------------------- Logout Handling --------------------
function logoutUser() {
    localStorage.removeItem("token");
    localStorage.removeItem("profilePicture");
    alert("You have successfully logged out.");
    window.location.href = "login.html";
}

function logoutSilently() {
    localStorage.removeItem("token");
    localStorage.removeItem("profilePicture");
    window.location.href = "login.html";
}

// -------------------- Inactivity Timer --------------------
function trackInactivityLogout() {
    let timer;
    const resetTimer = () => {
        clearTimeout(timer);
        localStorage.setItem("lastActive", Date.now().toString());
        timer = setTimeout(() => logoutSilently(), MAX_SESSION_TIME);
    };

    ["mousemove", "keydown", "click"].forEach(event =>
        document.addEventListener(event, resetTimer)
    );

    resetTimer();
}
