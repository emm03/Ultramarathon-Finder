document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    const profilePic = localStorage.getItem("profilePicture");

    const tab = document.getElementById("account-tab");
    if (!tab || !token || !username) return;

    tab.innerHTML = `
        <div class="auth-dropdown" id="auth-dropdown">
            <img src="${profilePic || '/images/default-profile.png'}" class="profile-icon" alt="Profile" />
            <span>${username}'s Account Info</span>
            <div class="dropdown-content" id="auth-dropdown-content">
                <a href="/account.html">Profile</a>
                <a href="/training_log.html">Training Log</a>
                <a href="#" onclick="logout()">Sign Out</a>
            </div>
        </div>
    `;

    // Enable mobile toggle
    const dropdown = document.getElementById("auth-dropdown");
    const dropdownContent = document.getElementById("auth-dropdown-content");

    if (window.innerWidth <= 768 && dropdown && dropdownContent) {
        dropdown.addEventListener("click", (e) => {
            e.stopPropagation(); // Prevent click from bubbling
            dropdownContent.classList.toggle("show");
        });

        // Close dropdown if tapped outside
        document.addEventListener("click", () => {
            dropdownContent.classList.remove("show");
        });

        // Prevent dropdown from closing when clicking inside
        dropdownContent.addEventListener("click", (e) => {
            e.stopPropagation();
        });
    }
});
