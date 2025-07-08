const clientId = 162687;
const redirectUri = 'https://ultramarathon-finder-backend.onrender.com/strava-auth';

let userToken = null;

fetch('https://ultramarathon-finder-backend.onrender.com/api/auth/status', {
    credentials: 'include'
})
    .then(res => res.json())
    .then(data => {
        const accountTab = document.getElementById('account-tab');

        if (data.loggedIn) {
            userToken = data.token;
            localStorage.setItem("token", userToken);

            const profilePic = document.getElementById("strava-profile-pic");
            const profileName = document.getElementById("strava-name");
            const summaryText = document.getElementById("strava-summary");

            const picSrc = data.user.profilePicture || "default-profile.png";

            if (profilePic) profilePic.src = picSrc;
            if (profileName) profileName.textContent = data.user.username || "Strava User";
            if (summaryText) summaryText.textContent = "Strava activities shown below.";

            accountTab.innerHTML = `
                <div class="dropdown">
                  <img src="${picSrc}" class="profile-pic" />
                  <div class="dropdown-content">
                    <a href="account.html">Profile</a>
                    <a href="training_log.html" class="active">Training Log</a>
                    <a href="#" onclick="logout()">Sign Out</a>
                  </div>
                </div>`;

            if (data.user.stravaAccessToken) {
                localStorage.setItem("stravaConnected", "true");

                document.getElementById('connect-strava').style.display = 'none';
                document.getElementById('refresh-strava').style.display = 'inline-block';
                document.getElementById('disconnect-strava').style.display = 'inline-block';
            }

            fetchActivities();
        } else {
            const tokenFromStorage = localStorage.getItem("token");
            if (tokenFromStorage) {
                userToken = tokenFromStorage;
                fetchActivities();
            } else {
                accountTab.innerHTML = `<a href="account.html">My Account</a>`;
            }
        }
    });

function logout() {
    localStorage.removeItem("token");
    fetch('https://ultramarathon-finder-backend.onrender.com/api/auth/logout', {
        credentials: 'include'
    }).then(() => window.location.reload());
}

document.getElementById("connect-strava")?.addEventListener("click", () => {
    if (!userToken) {
        alert("You must be logged in to connect with Strava.");
        return;
    }

    localStorage.setItem("strava_state_token", userToken);
    const scope = 'activity:read_all';
    const url = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&approval_prompt=force&scope=${scope}&state=${userToken}`;
    window.location.href = url;
});

function formatPace(timeSec, distMeters) {
    const pace = timeSec / (distMeters / 1609); // sec per mile
    const min = Math.floor(pace / 60);
    const sec = Math.round(pace % 60);
    return `${min}:${sec.toString().padStart(2, '0')}/mi`;
}

function formatDuration(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}m ${sec}s`;
}

async function fetchActivities() {
    const loading = document.getElementById('loading-indicator');
    if (loading) loading.style.display = 'block';

    try {
        const res = await fetch('https://ultramarathon-finder-backend.onrender.com/api/strava/activities', {
            headers: {
                'Authorization': `Bearer ${userToken}`
            },
            credentials: 'include'
        });

        const data = await res.json();
        const list = document.getElementById('activity-list');
        const summary = document.getElementById('weekly-summary');
        const section = document.getElementById('activity-section');
        const refresh = document.getElementById('refresh-strava');
        const connect = document.getElementById('connect-strava');

        if (Array.isArray(data) && data.length > 0) {
            section.style.display = 'block';
            refresh.style.display = 'inline-block';
            connect.style.display = 'none';
            document.getElementById('disconnect-strava').style.display = 'inline-block';

            list.innerHTML = '';
            let totalDistance = 0;
            let totalTime = 0;

            const profilePic = document.getElementById("strava-profile-pic");
            const profileName = document.getElementById("strava-name");
            const summaryText = document.getElementById("strava-summary");

            if (profilePic && data[0].profile_picture) {
                profilePic.src = data[0].profile_picture;
            }

            if (profileName && data[0].username) {
                profileName.textContent = data[0].username;
            }

            data.forEach(act => {
                totalDistance += act.distance;
                totalTime += act.elapsed_time;

                const allPhotos = [...new Set((act.photos || []).filter(url => url.includes('cloudfront') && !url.includes('placeholder')))];
                const carousel = allPhotos.map(photo => `<img src="${photo}" class="carousel-photo" alt="Activity photo" />`).join('');

                const mediaContent = `
                    ${act.embed_token ? `
                        <div class="map-embed">
                            <iframe height="405" width="100%" frameborder="0" allowtransparency="true" scrolling="no"
                                src="https://www.strava.com/activities/${act.id}/embed/${act.embed_token}">
                            </iframe>
                        </div>` : ''}
                    ${carousel ? `<div class="photo-carousel">${carousel}</div>` : ''}
                    <div class="strava-cta" style="margin-top: 5px;">
                        <a href="https://www.strava.com/activities/${act.id}" target="_blank">Want to see all your media? View this activity on Strava</a>
                    </div>
                `;

                const div = document.createElement('div');
                div.className = 'activity-card';
                div.innerHTML = `
                    <div class="activity-header vertical-layout">
                        <h2 class="activity-title">${act.name || "Untitled Run"}</h2>
                        ${act.description ? `<p class="activity-description">${act.description}</p>` : ''}
                    </div>
                    ${mediaContent}
                `;
                list.appendChild(div);

            });

            summary.innerHTML = `✅ Total distance this week: <strong>${(totalDistance / 1000).toFixed(1)} km</strong> | Time: <strong>${(totalTime / 3600).toFixed(2)} hrs</strong>`;
            summary.style.display = 'block';

            if (summaryText) {
                summaryText.textContent = `✅ ${(totalDistance / 1000).toFixed(1)} km | ${(totalTime / 3600).toFixed(2)} hrs this week`;
            }

        } else {
            section.style.display = 'none';
            refresh.style.display = 'none';
            connect.style.display = 'inline-block';
        }
    } catch (err) {
        console.error("Error fetching activities:", err);
        document.getElementById('connect-strava').style.display = 'inline-block';
    } finally {
        if (loading) loading.style.display = 'none';
    }
}

document.getElementById('refresh-strava')?.addEventListener('click', fetchActivities);

document.getElementById('disconnect-strava')?.addEventListener('click', async () => {
    if (!userToken) return;

    const confirmed = confirm("Are you sure you want to disconnect your Strava account?");
    if (!confirmed) return;

    try {
        const res = await fetch('https://ultramarathon-finder-backend.onrender.com/api/strava/disconnect', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        const result = await res.json();
        if (res.ok) {
            alert('Strava disconnected!');
            location.reload();
        } else {
            alert('Failed to disconnect: ' + result.error);
        }
    } catch (err) {
        console.error("Error disconnecting Strava:", err);
        alert("Error disconnecting Strava");
    }
});
