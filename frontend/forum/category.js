document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const rawTopic = urlParams.get("topic");

    const titleEl = document.getElementById("category-title");
    const hiddenInput = document.getElementById("post-topic");

    if (!rawTopic || !titleEl || !hiddenInput) {
        if (titleEl) titleEl.textContent = "Invalid Category";
        return;
    }

    const decodedTopic = decodeURIComponent(rawTopic);
    titleEl.textContent = decodedTopic;
    hiddenInput.value = decodedTopic;

    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    const loadPosts = async () => {
        try {
            const response = await fetch(`/api/forum/category/${encodeURIComponent(decodedTopic)}`);
            const posts = await response.json();

            const container = document.getElementById("posts-container");
            container.innerHTML = "";

            if (!posts.length) {
                container.innerHTML = "<p>No posts yet in this category. Be the first to post!</p>";
                return;
            }

            posts.forEach(post => {
                const postDiv = document.createElement("div");
                postDiv.className = "post-card";

                const isOwner = token && username === post.username;

                const repliesHtml = (post.replies || []).map(reply => `
                    <div class="reply">
                        <h5>${reply.username}</h5>
                        <small>${new Date(reply.createdAt).toLocaleString()}</small>
                        <p>${reply.content}</p>
                    </div>
                `).join('');

                postDiv.innerHTML = `
                    <div class="post-header">
                        <img class="avatar" src="${post.profilePicture || './images/default-profile.png'}" alt="Avatar" />
                        <div class="meta">
                            <strong>${post.username || 'Anonymous'}</strong><br>
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
                        const res = await fetch(`/api/forum/posts/${post._id}/reply`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`
                            },
                            body: JSON.stringify({ content })
                        });
                        if (res.ok) loadPosts();
                        else alert("Failed to post reply.");
                    } catch (err) {
                        console.error("Reply error:", err);
                    }
                });

                container.appendChild(postDiv);
            });
        } catch (err) {
            console.error("Error loading posts:", err);
        }
    };

    loadPosts();

    document.getElementById("post-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const title = document.getElementById("post-title").value.trim();
        const message = document.getElementById("post-message").value.trim();
        const topic = document.getElementById("post-topic").value;
        const errorEl = document.getElementById("form-error");

        errorEl.textContent = "";

        if (!token) {
            errorEl.textContent = "You must be logged in to post.";
            return;
        }

        if (!title || !message || !topic) {
            errorEl.textContent = "All fields are required.";
            return;
        }

        try {
            const response = await fetch("/api/forum/posts", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ title, message, topic }),
            });

            const data = await response.json();

            if (!response.ok) {
                errorEl.textContent = data.message || "Error submitting post.";
            } else {
                document.getElementById("post-form").reset();
                loadPosts();
            }
        } catch (err) {
            console.error("Error submitting post:", err);
            errorEl.textContent = "Failed to submit post.";
        }
    });
});
