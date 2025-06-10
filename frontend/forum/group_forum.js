document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    const profilePic = localStorage.getItem("profilePicture");

    const urlParams = new URLSearchParams(window.location.search);
    const groupName = urlParams.get("group");

    const titleEl = document.getElementById("group-title");
    const postsEl = document.getElementById("group-posts");
    const form = document.getElementById("group-post-form");
    const errorMsg = document.getElementById("group-form-error");

    // Show logged-in dropdown
    if (token && username) {
        const accountTab = document.getElementById("account-tab");
        if (accountTab) accountTab.style.display = "none";

        const dropdown = document.querySelector(".auth-dropdown");
        if (dropdown) {
            dropdown.style.display = "block";
            document.getElementById("nav-username").textContent = username;
            document.getElementById("nav-profile-pic").src = profilePic || "/images/default-profile.png";
        }
    }

    if (!groupName) {
        titleEl.textContent = "Group Not Found";
        postsEl.innerHTML = "<p style='text-align:center;'>Invalid group URL.</p>";
    } else {
        titleEl.textContent = `${groupName} Training Group`;
        fetchGroupPosts();
    }

    async function fetchGroupPosts() {
        try {
            const res = await fetch(`https://ultramarathon-finder-backend.onrender.com/api/groups/group-posts?group=${encodeURIComponent(groupName)}`);
            const data = await res.json();
            postsEl.innerHTML = "";

            if (data.posts && data.posts.length > 0) {
                data.posts.forEach(post => {
                    const div = document.createElement("div");
                    div.className = "post-card";
                    const isOwner = token && username === post.username;

                    const replySection = `
                        <div class="replies" id="replies-${post._id}">
                            ${(post.replies || []).map(reply => `
                                <div class="reply-card">
                                    <strong>${reply.username}</strong>: ${reply.content}
                                </div>
                            `).join('')}
                        </div>
                        <div class="reply-form" id="reply-form-${post._id}" style="display: none; margin-top: 10px;">
                            <input type="text" class="reply-input" placeholder="Write a reply..." style="width: 100%; padding: 8px;" />
                            <button class="submit-reply-btn join-btn" data-id="${post._id}">Post Reply</button>
                        </div>`;

                    div.innerHTML = `
                        <div class="post-header">
                            <img class="avatar" src="${post.profilePicture || './images/default-profile.png'}" alt="User Avatar">
                            <div class="meta">
                                <strong>${post.username || 'Anonymous'}</strong><br>
                                <small>${new Date(post.createdAt).toLocaleString()}</small>
                            </div>
                        </div>
                        <h4>${post.title}</h4>
                        <p>${post.message}</p>
                        <div class="post-actions">
                            ${isOwner ? `
                                <button class="edit-btn green-btn" data-id="${post._id}" data-title="${post.title}" data-message="${post.message}">✏️ Edit</button>
                                <button class="delete-btn green-btn" data-id="${post._id}">🗑️ Delete</button>
                            ` : ''}
                            <button class="reply-btn join-btn" data-id="${post._id}">💬 Reply</button>
                        </div>
                        ${replySection}
                    `;

                    postsEl.appendChild(div);
                });

                attachReplyListeners();
            } else {
                postsEl.innerHTML = "<p style='text-align:center;'>No posts yet. Be the first to share!</p>";
            }
        } catch (err) {
            console.error("Failed to load group posts:", err);
            postsEl.innerHTML = "<p>Error loading posts. Try again later.</p>";
        }
    }

    function attachReplyListeners() {
        document.querySelectorAll('.reply-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const postId = btn.dataset.id;
                const form = document.getElementById(`reply-form-${postId}`);
                if (form) form.style.display = 'block';
            });
        });

        document.querySelectorAll('.submit-reply-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const postId = btn.dataset.id;
                const form = document.getElementById(`reply-form-${postId}`);
                const input = form?.querySelector('.reply-input');
                const content = input?.value.trim();

                if (!content) return alert("Reply cannot be empty.");

                try {
                    const res = await fetch(`https://ultramarathon-finder-backend.onrender.com/api/groups/group-posts/${postId}/reply`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`
                        },
                        body: JSON.stringify({ content })
                    });

                    if (res.ok) {
                        input.value = '';
                        fetchGroupPosts(); // reload replies
                    } else {
                        alert("Failed to post reply.");
                    }
                } catch (err) {
                    console.error("Reply error:", err);
                    alert("Network error posting reply.");
                }
            });
        });
    }

    form?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const title = document.getElementById("group-post-title").value.trim();
        const message = document.getElementById("group-post-message").value.trim();
        errorMsg.textContent = "";

        if (!token) return errorMsg.textContent = "Please log in to post.";

        try {
            const res = await fetch("https://ultramarathon-finder-backend.onrender.com/api/groups/group-posts", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ title, message, groupName })
            });

            if (res.ok) {
                form.reset();
                fetchGroupPosts();
            } else {
                const data = await res.json();
                errorMsg.textContent = data.message || "Failed to post.";
            }
        } catch (err) {
            errorMsg.textContent = "Network error. Try again later.";
        }
    });

    // Only show form if joined
    if (token && groupName) {
        fetch("https://ultramarathon-finder-backend.onrender.com/api/auth/account", {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                const joined = data?.user?.joinedGroups || [];
                const cleanGroup = decodeURIComponent(groupName).trim();
                const hasJoined = joined.some(g => g.trim().toLowerCase() === cleanGroup.toLowerCase());

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
            .catch(err => {
                console.error("Error checking joined groups:", err);
            });
    }

    // Delete & Edit
    document.addEventListener('click', async (e) => {
        const postId = e.target.dataset.id;

        if (e.target.classList.contains('delete-btn')) {
            if (!confirm('Are you sure you want to delete this post?')) return;
            try {
                const res = await fetch(`https://ultramarathon-finder-backend.onrender.com/api/groups/group-posts/${postId}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) fetchGroupPosts();
                else alert('Failed to delete post.');
            } catch (err) {
                console.error('Delete error:', err);
            }
        }

        if (e.target.classList.contains('edit-btn')) {
            const oldTitle = e.target.dataset.title;
            const oldMsg = e.target.dataset.message;
            const newTitle = prompt('Edit Title:', oldTitle);
            const newMessage = prompt('Edit Message:', oldMsg);
            if (!newTitle || !newMessage) return;

            try {
                const res = await fetch(`https://ultramarathon-finder-backend.onrender.com/api/groups/group-posts/${postId}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ title: newTitle, message: newMessage })
                });
                if (res.ok) fetchGroupPosts();
                else alert('Failed to edit post.');
            } catch (err) {
                console.error('Edit error:', err);
            }
        }
    });
});
