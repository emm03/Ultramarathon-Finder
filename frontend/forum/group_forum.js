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
                `https://ultramarathon-finder-backend.onrender.com/api/groups/group-posts?group=${encodeURIComponent(decodedGroup)}`
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

                const repliesHtml = (post.replies || []).map(r => `
                    <div class="reply">
                        <h5>${r.username}</h5>
                        <small>${new Date(r.createdAt).toLocaleString()}</small>
                        <p>${r.content}</p>
                    </div>
                `).join('');

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
                        <button class="reply-btn" data-id="${post._id}">💬 Reply</button>
                        ${isOwner ? `
                        <button class="edit-btn green-btn" data-id="${post._id}" data-title="${post.title}" data-message="${post.message}">✏️ Edit</button>
                        <button class="delete-btn green-btn" data-id="${post._id}">🗑️ Delete</button>` : ''}
                    </div>
                    <div class="replies">${repliesHtml || '<p>No replies yet.</p>'}</div>
                    <div class="reply-input" style="display: none; margin-top: 10px;">
                        <textarea placeholder="Write your reply..." rows="3" style="width: 100%; margin-bottom: 8px;"></textarea>
                        <button class="submit-reply-btn">Submit Reply</button>
                    </div>
                `;

                const replyBtn = postDiv.querySelector(".reply-btn");
                const replyBox = postDiv.querySelector(".reply-input");
                const submitReplyBtn = postDiv.querySelector(".submit-reply-btn");

                replyBtn.addEventListener("click", () => {
                    replyBox.style.display = replyBox.style.display === "none" ? "block" : "none";
                });

                submitReplyBtn.addEventListener("click", async () => {
                    const textarea = replyBox.querySelector("textarea");
                    const content = textarea.value.trim();
                    if (!content) return alert("Reply cannot be empty.");

                    try {
                        const res = await fetch(`https://ultramarathon-finder-backend.onrender.com/api/groups/group-posts/${post._id}/reply`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`
                            },
                            body: JSON.stringify({ content })
                        });
                        if (res.ok) fetchGroupPosts();
                        else alert("Failed to post reply.");
                    } catch (err) {
                        console.error("Reply submit error:", err);
                    }
                });

                postsEl.appendChild(postDiv);
            });
        } catch (err) {
            console.error("Error loading group posts:", err);
            postsEl.innerHTML = "<p>Error loading posts. Please try again later.</p>";
        }
    };

    fetchGroupPosts();

    document.addEventListener("click", async (e) => {
        const postId = e.target.dataset.id;
        if (e.target.classList.contains("edit-btn")) {
            const oldTitle = e.target.dataset.title;
            const oldMessage = e.target.dataset.message;
            const newTitle = prompt("Edit post title:", oldTitle);
            const newMessage = prompt("Edit post message:", oldMessage);
            if (!newTitle || !newMessage) return;

            try {
                const res = await fetch(`https://ultramarathon-finder-backend.onrender.com/api/groups/group-posts/${postId}`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ title: newTitle, message: newMessage })
                });
                if (res.ok) fetchGroupPosts();
                else alert("Failed to edit post.");
            } catch (err) {
                console.error("Edit post error:", err);
            }
        }

        if (e.target.classList.contains("delete-btn")) {
            if (!confirm("Are you sure you want to delete this post?")) return;

            try {
                const res = await fetch(`https://ultramarathon-finder-backend.onrender.com/api/groups/group-posts/${postId}`, {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) fetchGroupPosts();
                else alert("Failed to delete post.");
            } catch (err) {
                console.error("Delete post error:", err);
            }
        }
    });

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
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ title, message, groupName: decodedGroup })
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
    
});
