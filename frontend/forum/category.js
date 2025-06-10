document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const topic = urlParams.get("topic");
    const decodedTopic = decodeURIComponent(topic);
    document.getElementById("category-title").textContent = decodedTopic;
    document.getElementById("post-topic").value = decodedTopic;

    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    const loadPosts = async () => {
        try {
            const response = await fetch(`/api/forum/category/${encodeURIComponent(topic)}`);
            const posts = await response.json();

            const container = document.getElementById("posts-container");
            container.innerHTML = "";

            if (posts.length === 0) {
                container.innerHTML = "<p>No posts yet in this category. Be the first to post!</p>";
                return;
            }

            posts.forEach(post => {
                const postDiv = document.createElement("div");
                postDiv.className = "post-card";

                const isOwner = token && username === post.username;

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
                        <button onclick="window.location.href='/comments.html?postId=${post._id}'" class="comment-btn">💬 Reply</button>
                        ${isOwner ? `
                            <button class="edit-btn green-btn" data-id="${post._id}" data-title="${post.title}" data-message="${post.message}">✏️ Edit</button>
                            <button class="delete-btn green-btn" data-id="${post._id}">🗑️ Delete</button>
                        ` : ''}
                    </div>
                `;

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
