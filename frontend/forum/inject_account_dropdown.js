document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    const profilePic = localStorage.getItem("profilePicture");

    const tab = document.getElementById("account-tab");
    if (!tab || !token || !username) return;

    tab.innerHTML = `
        <div class="auth-dropdown">
            <img src="${profilePic || '/images/default-profile.png'}" class="profile-icon" alt="Profile" />
            <span>${username}'s Account Info</span>
            <div class="dropdown-content">
                <a href="/account.html">Profile</a>
                <a href="/training_log.html">Training Log</a>
                <a href="#" onclick="logout()">Sign Out</a>
            </div>
        </div>
    `;
});
