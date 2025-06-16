// inject_account_dropdown.js (works for both root and /forum pages)

document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    const profilePic = localStorage.getItem("profilePicture");

    const tab = document.getElementById("account-tab");
    if (!tab) return;

    if (!token || !username) {
        tab.style.display = "block";
        return;
    }

    tab.innerHTML = `
        <div class="auth-dropdown">
            <img id="nav-profile-pic" src="${profilePic || '/images/default-profile.png'}" alt="Profile" class="profile-icon">
            <div class="dropdown-content">
                <span><strong>${username}</strong>'s Account Info</span>
                <a href="/account.html">Edit Profile</a>
                <a href="/training_log.html">Training Log</a>
                <a href="#" onclick="logout()">Logout</a>
            </div>
        </div>
    `;
    tab.style.display = "block";
});
