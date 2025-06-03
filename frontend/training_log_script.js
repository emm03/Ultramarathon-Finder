const clientId = 162687;
const redirectUri = 'https://ultramarathon-finder-backend.onrender.com/strava-auth';

let userToken = null;

// 1️⃣ Check login status and set up Strava connection
fetch('https://ultramarathon-finder-backend.onrender.com/api/auth/status', {
    credentials: 'include'
})
    .then(res => res.json())
    .then(data => {
        if (data.loggedIn) {
            userToken = data.token;

            // Set user ID as a cookie so /strava-auth can read it
            document.cookie = `strava_user_id=${data.user._id}; path=/`;

            fetchActivities(); // Load activities on page load
        } else {
            document.getElementById('connect-strava').style.display = 'inline-block';
        }
    });

// 2️⃣ Connect with Strava button
const connectBtn = document.getElementById("connect-strava");
connectBtn?.addEventListener("click", () => {
    if (!userToken) {
        alert("You must be logged in to connect with Strava.");
        return;
    }

    const scope = 'activity:read_all';
    const url = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&approval_prompt=force&scope=${scope}`;
    window.location.href = url;
});

// 3️⃣ Fetch user-specific activities
async function fetchActivities() {
    try {
        const res = await fetch('https://ultramarathon-finder-backend.onrender.com/api/strava/activities', {
            headers: {
                Authorization: `Bearer ${userToken}`
            },
            credentials: 'include'
        });

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
        } else {
            document.getElementById('connect-strava').style.display = 'inline-block';
        }
    } catch (err) {
        console.error("Error fetching activities:", err);
        document.getElementById('connect-strava').style.display = 'inline-block';
    }
}

document.getElementById('refresh-strava')?.addEventListener('click', fetchActivities);
