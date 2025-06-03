// training_log_script.js
const clientId = 162687;
const redirectUri = 'https://ultramarathon-finder-backend.onrender.com/strava-auth';

// Load user profile info and dropdown
fetch('/api/auth/status')
    .then(res => res.json())
    .then(data => {
        const accountTab = document.getElementById('account-tab');
        if (data.loggedIn) {
            accountTab.innerHTML = `
        <div class="dropdown">
          <img src="${data.user.profilePicture || 'default_profile.png'}" class="profile-pic" />
          <div class="dropdown-content">
            <a href="account.html">Profile</a>
            <a href="training_log.html" class="active">Training Log</a>
            <a href="#" onclick="logout()">Sign Out</a>
          </div>
        </div>`;
        } else {
            accountTab.innerHTML = `<a href="account.html">My Account</a>`;
        }
    });

function logout() {
    fetch('/api/auth/logout').then(() => window.location.reload());
}

// Handle Strava connect button
const connectBtn = document.getElementById("connect-strava");
connectBtn?.addEventListener("click", () => {
    const scope = 'activity:read_all';
    const url = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&approval_prompt=force&scope=${scope}`;
    window.location.href = url;
});

// Fetch and render activities
async function fetchActivities() {
    try {
        const res = await fetch('https://ultramarathon-finder-backend.onrender.com/api/strava/activities');
        const data = await res.json();

        if (Array.isArray(data) && data.length > 0) {
            document.getElementById('activity-section').style.display = 'block';
            document.getElementById('refresh-strava').style.display = 'inline-block';
            document.getElementById('connect-strava').style.display = 'none';

            const list = document.getElementById('activity-list');
            list.innerHTML = '';

            let totalDistance = 0;
            let totalTime = 0;

            data.forEach(act => {
                totalDistance += act.distance;
                totalTime += act.elapsed_time;

                const div = document.createElement('div');
                div.className = 'activity-card';
                div.innerHTML = `
          <h3>${act.name}</h3>
          <div class="activity-meta">${new Date(act.start_date).toLocaleString()} | ${act.type}</div>
          <div class="activity-description">${act.description || 'No description provided.'}</div>
          <div class="activity-stats">
            Distance: ${(act.distance / 1000).toFixed(2)} km<br>
            Time: ${(act.elapsed_time / 60).toFixed(1)} mins<br>
            Pace: ${(act.elapsed_time / 60 / (act.distance / 1000)).toFixed(1)} min/km
          </div>
        `;
                list.appendChild(div);
            });

            const summary = document.getElementById('weekly-summary');
            summary.innerHTML = `✅ Total distance this week: <strong>${(totalDistance / 1000).toFixed(1)} km</strong> | Time: <strong>${(totalTime / 3600).toFixed(2)} hrs</strong>`;
            summary.style.display = 'block';
        }
    } catch (err) {
        console.error("Error fetching activities:", err);
    }
}

document.getElementById('refresh-strava')?.addEventListener('click', fetchActivities);

// Auto-fetch on page load if redirected
if (window.location.pathname.includes('training_log.html')) {
    fetchActivities();
}
