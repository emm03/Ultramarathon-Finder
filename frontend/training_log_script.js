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

            if (profilePic && profileName) {
                profilePic.src = data.user.profilePicture || "default_profile.png";
                profileName.textContent = data.user.username || "Strava User";
                summaryText.textContent = "Strava activities shown below.";
            }

            accountTab.innerHTML = `
                <div class="dropdown">
                  <img src="${data.user.profilePicture || 'default_profile.png'}" class="profile-pic" />
                  <div class="dropdown-content">
                    <a href="account.html">Profile</a>
                    <a href="training_log.html" class="active">Training Log</a>
                    <a href="#" onclick="logout()">Sign Out</a>
                  </div>
                </div>`;

            if (data.user.stravaAccessToken) {
                document.getElementById('connect-strava').style.display = 'none';
                document.getElementById('refresh-strava').style.display = 'inline-block';
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

            list.innerHTML = '';
            let totalDistance = 0;
            let totalTime = 0;

            data.forEach(act => {
                totalDistance += act.distance;
                totalTime += act.elapsed_time;

                const uniquePhotos = [...new Set(
                    (act.photos || []).filter(url =>
                        url.includes('http') &&
                        !url.includes('placeholder') &&
                        !url.includes('medium.jpg')
                    )
                )];

                const profileImg = `<img src="${act.profile_picture || 'default_profile.png'}" class="profile-pic" alt="Profile photo" />`;
                const userInfoBlock = `
                    <div class="activity-header">
                        ${profileImg}
                        <div class="activity-user-info">
                            <strong>${act.username || 'Strava User'}</strong><br>
                            <span>${new Date(act.start_date).toLocaleString()}</span>
                        </div>
                    </div>`;

                const mediaContent = `
                    ${act.embed_token ? `
                        <div class="map-embed">
                            <iframe height="405" width="100%" frameborder="0" allowtransparency="true" scrolling="no"
                                src="https://www.strava.com/activities/${act.id}/embed/${act.embed_token}">
                            </iframe>
                        </div>` : ''
                    }
                    ${uniquePhotos.length > 0 ? `
                        <div class="photo-carousel">
                            ${uniquePhotos.map(url => `<img src="${url}" class="carousel-photo" alt="Activity photo" />`).join('')}
                        </div>` : ''
                    }
                `;

                const div = document.createElement('div');
                div.className = 'activity-card';
                div.innerHTML = `
                    ${userInfoBlock}
                    <h3 class="activity-title">${act.name}</h3>
                    <div class="activity-description">${act.description || 'No description provided.'}</div>
                    <div class="activity-stats">
                        <span><strong>Distance:</strong> ${(act.distance / 1000).toFixed(2)} km</span>
                        <span><strong>Time:</strong> ${(act.elapsed_time / 60).toFixed(1)} mins</span>
                        <span><strong>Pace:</strong> ${(act.elapsed_time / 60 / (act.distance / 1000)).toFixed(1)} min/km</span>
                    </div>
                    ${mediaContent}
                `;
                list.appendChild(div);
            });

            summary.innerHTML = `✅ Total distance this week: <strong>${(totalDistance / 1000).toFixed(1)} km</strong> | Time: <strong>${(totalTime / 3600).toFixed(2)} hrs</strong>`;
            summary.style.display = 'block';

            const summaryText = document.getElementById("strava-summary");
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
