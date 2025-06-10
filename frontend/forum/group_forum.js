document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    const urlParams = new URLSearchParams(window.location.search);
    const groupName = urlParams.get("group");

    const titleEl = document.getElementById("group-title");
    const postsEl = document.getElementById("group-posts");
    const form = document.getElementById("group-post-form");
    const errorMsg = document.getElementById("group-form-error");

    if (!groupName || !titleEl || !postsEl || !form) {
        if (titleEl) titleEl.textContent = "Invalid Group";
        return;
    }

    const decodedGroup = decodeURIComponent(groupName);
    titleEl.textContent = `${decodedGroup} Training Group`;

    const fetchGroupPosts = async () => {
        try {
            const res = await fetch(
                `https://ultramarathon-finder-backend.onrender.com/api/groups/group-posts?group=${encodeURIComponent(
                    decodedGroup
                )}`
            );
            const data = await res.json();
            postsEl.innerHTML = "";

            if (!data.posts || data.posts.length === 0) {
                postsEl.innerHTML = "<p>No posts yet. Be the first to share!</p>";
                return;
            }

            data.posts.forEach((post) => {
                const postDiv = document.createElement("div");
                postDiv.className = "post-card";

                const isOwner = token && username === post.username;

                postDiv.innerHTML = `
            <div class="post-header">
                <img class="avatar" src="${post.profilePicture || '/images/default-profile.png'}" alt="User Avatar" />
                <div class="meta">
                    <strong>${post.username || "Anonymous"}</strong><br>
                    <small>${new Date(post.createdAt).toLocaleString()}</small>
                </div>
            </div>
            <h4>${post.title}</h4>
            <p>${post.message}</p>
            <div class="post-actions">
                ${isOwner ? `
                <button class="edit-btn green-btn" data-id="${post._id}" data-title="${post.title}" data-message="${post.message}">✏️ Edit</button>
                <button class="delete-btn green-btn" data-id="${post._id}">🗑️ Delete</button>` : ''}
            </div>
          `;

                postsEl.appendChild(postDiv);
            });
        } catch (err) {
            console.error("Error loading group posts:", err);
            postsEl.innerHTML = "<p>Error loading posts. Please try again later.</p>";
        }
    };

    fetchGroupPosts();

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const title = document.getElementById("group-post-title").value.trim();
        const message = document.getElementById("group-post-message").value.trim();
        errorMsg.textContent = "";

        if (!token) {
            errorMsg.textContent = "You must be logged in to post.";
            return;
        }

        if (!title || !message) {
            errorMsg.textContent = "All fields are required.";
            return;
        }

        try {
            const response = await fetch(
                "https://ultramarathon-finder-backend.onrender.com/api/groups/group-posts",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ title, message, groupName: decodedGroup }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                errorMsg.textContent = data.message || "Error submitting post.";
            } else {
                form.reset();
                fetchGroupPosts();
            }
        } catch (err) {
            console.error("Error submitting post:", err);
            errorMsg.textContent = "Failed to submit post.";
        }
    });

    // Optional: restrict posting unless user has joined the group
    if (token && decodedGroup) {
        fetch("https://ultramarathon-finder-backend.onrender.com/api/auth/account", {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => res.json())
            .then((data) => {
                const joined = data?.user?.joinedGroups || [];
                const hasJoined = joined.some(
                    (g) => g.trim().toLowerCase() === decodedGroup.trim().toLowerCase()
                );

                if (!hasJoined) {
                    form.style.display = "none";
                    const warning = document.createElement("p");
                    warning.textContent = "Join this group to post messages!";
                    warning.style.textAlign = "center";
                    warning.style.fontWeight = "bold";
                    warning.style.marginBottom = "20px";
                    postsEl.parentNode.insertBefore(warning, postsEl);
                }
            })
            .catch((err) => console.error("Join check failed:", err));
    }
});
