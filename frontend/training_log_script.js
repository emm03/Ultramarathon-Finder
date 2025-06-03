const clientId = 162687;
const redirectUri = 'https://ultramarathon-finder-backend.onrender.com/strava-auth';

let userToken = null;

// Get user session and fetch activities
fetch('https://ultramarathon-finder-backend.onrender.com/api/auth/status', {
    credentials: 'include'
})
    .then(res => res.json())
    .then(data => {
        if (data.loggedIn) {
            userToken = data.token;
            document.cookie = `strava_user_id=${data.user._id}; path=/`; // Important!
            fetchActivities();
        }
    });

// Connect with Strava
document.getElementById("connect-strava")?.addEventListener("click", () => {
    const scope = 'activity:read_all';
    const url = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&approval_prompt=force&scope=${scope}`;
    window.location.href = url;
});

// Fetch and render activities
async function fetchActivities() {
    try {
        const res = await fetch('https://ultramarathon-finder-backend.onrender.com/api/strava/activities', {
            headers: {
                'Authorization': `Bearer ${userToken}`
            },
            credentials: 'include'
        });

        const data = await res.json();
        if (!Array.isArray(data)) return;

        const section = document.getElementById('activity-section');
        const list = document.getElementById('activity-list');
        const summary = document.getElementById('weekly-summary');

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

        summary.innerHTML = `✅ Weekly total: <strong>${(totalDistance / 1000).toFixed(1)} km</strong> | <strong>${(totalTime / 3600).toFixed(2)} hrs</strong>`;
        section.style.display = 'block';
        summary.style.display = 'block';
    } catch (err) {
        console.error("Error fetching activities:", err);
    }
}

