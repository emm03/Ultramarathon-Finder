document.addEventListener("DOMContentLoaded", async () => {
    const tab = document.getElementById("account-tab");
    if (!tab) return;

    const token = localStorage.getItem("token");
    const profilePic = localStorage.getItem("profilePicture");

    if (!token) {
        tab.innerHTML = `<a href="/account.html" class="auth-link">Sign In</a>`;
        return;
    }

    try {
        const res = await fetch("/api/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Token invalid");

        const data = await res.json();
        const username = data.username?.trim();

        // ✅ Reject generic or empty usernames
        if (!username || username.toLowerCase() === "user") {
            throw new Error("Invalid or generic username");
        }

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
    } catch (err) {
        // ✅ Clear invalid session and fallback to Sign In
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        localStorage.removeItem("profilePicture");
        tab.innerHTML = `<a href="/account.html" class="auth-link">Sign In</a>`;
    }
});
