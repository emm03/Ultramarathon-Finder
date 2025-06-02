const clientId = 162687;
const redirectUri = 'https://ultramarathon-finder-backend.onrender.com/strava-auth';

document.getElementById("connect-strava").addEventListener("click", () => {
    const scope = 'activity:read_all';
    const url = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&approval_prompt=force&scope=${scope}`;
    window.location.href = url;
});

document.getElementById("refresh-strava").addEventListener("click", () => {
    fetchActivities();
});

async function fetchActivities() {
    try {
        const res = await fetch('https://ultramarathon-finder-backend.onrender.com/api/strava/activities');
        const data = await res.json();

        if (Array.isArray(data)) {
            document.getElementById('activity-section').style.display = 'block';
            document.getElementById('connect-strava').style.display = 'none';

            const list = document.getElementById('activity-list');
            list.innerHTML = '';

            data.forEach(act => {
                const card = document.createElement('div');
                card.className = 'activity-card';

                const distanceKm = (act.distance / 1000).toFixed(2);
                const movingTimeMin = Math.floor(act.moving_time / 60);
                const pace = distanceKm > 0 ? (movingTimeMin / distanceKm).toFixed(2) : 'N/A';
                const date = new Date(act.start_date).toLocaleDateString();

                card.innerHTML = `
          <h3>${act.name || 'Untitled Activity'}</h3>
          <div class="activity-meta">${date}${act.location_city ? ' – ' + act.location_city : ''}</div>
          <div class="activity-description">${act.description || ''}</div>
          <div class="activity-stats">
            <strong>Distance:</strong> ${distanceKm} km<br>
            <strong>Time:</strong> ${movingTimeMin} min<br>
            <strong>Pace:</strong> ${pace} min/km
          </div>
        `;

                list.appendChild(card);
            });
        }
    } catch (err) {
        console.error("Error fetching activities:", err);
    }
}

// Auto-load if redirected back
if (window.location.pathname.includes('training_log.html')) {
    fetchActivities();
}
