
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

    let currentPage = 1;
    const postsPerPage = 3;
    let allPosts = [];

    const renderPagination = (totalPages) => {
        const container = document.getElementById("posts-container");
        const pagination = document.createElement("div");
        pagination.className = "pagination";

        if (currentPage > 1) {
            const prevBtn = document.createElement("button");
            prevBtn.textContent = "Previous";
            prevBtn.onclick = () => {
                currentPage--;
                renderPosts();
            };
            pagination.appendChild(prevBtn);
        }

        if (currentPage < totalPages) {
            const nextBtn = document.createElement("button");
            nextBtn.textContent = "Next";
            nextBtn.onclick = () => {
                currentPage++;
                renderPosts();
            };
            pagination.appendChild(nextBtn);
        }

        container.appendChild(pagination);
    };

    const renderPosts = () => {
        const container = document.getElementById("posts-container");
        container.innerHTML = "";

        if (!allPosts.length) {
            container.innerHTML = "<p>No posts yet in this category. Be the first to post!</p>";
            return;
        }

        const start = (currentPage - 1) * postsPerPage;
        const end = start + postsPerPage;
        const paginatedPosts = allPosts.slice(start, end);

        paginatedPosts.forEach(post => {
            const postDiv = document.createElement("div");
            postDiv.className = "post-card";

            const isOwner = token && username === post.username;

            const repliesHtml = (post.replies || []).map(reply => {
                const isReplyOwner = token && username === reply.username;
                return `
                    <div class="reply" data-reply-id="${reply._id}">
                        <h5>${reply.username}</h5>
                        <small>${new Date(reply.createdAt).toLocaleString()}</small>
                        <p>${reply.content}</p>
                        <div class="reply-actions">
                            ${isReplyOwner ? `
                                <button class="edit-reply-btn green-btn" data-post-id="${post._id}" data-reply-id="${reply._id}">✏️ Edit</button>
                                <button class="delete-reply-btn green-btn" data-post-id="${post._id}" data-reply-id="${reply._id}">🗑️ Delete</button>` : ''}
                            <button class="reply-to-reply-btn" data-post-id="${post._id}" data-username="${reply.username}">💬 Reply</button>
                        </div>
                    </div>
                `;
            }).join('');

            postDiv.innerHTML = `
                <div class="post-header">
                    <img class="avatar" src="${post.profilePicture || './images/default-profile.png'}" alt="Avatar" />
                    <div class="meta">
                        <strong>${post.username || 'Anonymous'}</strong><br>
                        <small>${new Date(post.createdAt).toLocaleString()}</small>
                    </div>
                </div>
                <div class="post-content" data-id="${post._id}">
                    <h4>${post.title}</h4>
                    <p>${post.message}</p>
                </div>
                <div class="post-actions">
                    <button class="reply-btn" data-id="${post._id}">💬 Reply</button>
                    ${isOwner ? `
                        <button class="edit-btn green-btn" data-id="${post._id}">✏️ Edit</button>
                        <button class="delete-btn green-btn" data-id="${post._id}">🗑️ Delete</button>` : ''}
                </div>
                <div class="replies">${repliesHtml || '<p>No replies yet.</p>'}</div>
                <div class="reply-input" style="display: none; margin-top: 10px;">
                    <textarea placeholder="Write your reply..." rows="3" style="width: 100%; margin-bottom: 8px;"></textarea>
                    <button class="submit-reply-btn">Submit Reply</button>
                </div>
            `;

            // Handle reply actions: edit, delete, reply-to-reply
            postDiv.querySelectorAll(".edit-reply-btn").forEach(btn => {
                btn.addEventListener("click", async () => {
                    const replyId = btn.dataset.replyId;
                    const postId = btn.dataset.postId;
                    const replyDiv = postDiv.querySelector(`.reply[data-reply-id="${replyId}"]`);
                    const currentContent = replyDiv.querySelector("p").textContent;
                    const newContent = prompt("Edit your reply:", currentContent);
                    if (newContent && newContent !== currentContent) {
                        try {
                            const res = await fetch(`/api/forum/posts/${postId}/reply/${replyId}`, {
                                method: "PUT",
                                headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${token}`
                                },
                                body: JSON.stringify({ content: newContent })
                            });
                            if (res.ok) loadPosts();
                            else alert("Failed to update reply.");
                        } catch (err) {
                            console.error("Error updating reply:", err);
                        }
                    }
                });
            });

            postDiv.querySelectorAll(".delete-reply-btn").forEach(btn => {
                btn.addEventListener("click", async () => {
                    const replyId = btn.dataset.replyId;
                    const postId = btn.dataset.postId;
                    if (confirm("Delete this reply?")) {
                        try {
                            const res = await fetch(`/api/forum/posts/${postId}/reply/${replyId}`, {
                                method: "DELETE",
                                headers: { Authorization: `Bearer ${token}` }
                            });
                            if (res.ok) loadPosts();
                            else alert("Failed to delete reply.");
                        } catch (err) {
                            console.error("Error deleting reply:", err);
                        }
                    }
                });
            });

            postDiv.querySelectorAll(".reply-to-reply-btn").forEach(btn => {
                btn.addEventListener("click", () => {
                    replyBox.style.display = "block";
                    const textarea = replyBox.querySelector("textarea");
                    textarea.value = `@${btn.dataset.username} `;
                    textarea.focus();
                });
            });

            // Inline reply logic
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

            // Edit post inline
            postDiv.querySelectorAll(".edit-btn").forEach(btn => {
                btn.addEventListener("click", () => {
                    const postContent = postDiv.querySelector(".post-content");
                    const titleEl = postContent.querySelector("h4");
                    const msgEl = postContent.querySelector("p");

                    const oldTitle = titleEl.textContent;
                    const oldMsg = msgEl.textContent;

                    postContent.innerHTML = `
                        <input type="text" value="${oldTitle}" class="edit-title-input" /><br/>
                        <textarea class="edit-msg-textarea">${oldMsg}</textarea><br/>
                        <button class="save-edit-btn orange-btn">Save</button>
                        <button class="cancel-edit-btn orange-btn">Cancel</button>
                    `;

                    postContent.querySelector(".save-edit-btn").addEventListener("click", async () => {
                        const newTitle = postContent.querySelector(".edit-title-input").value.trim();
                        const newMsg = postContent.querySelector(".edit-msg-textarea").value.trim();
                        if (!newTitle || !newMsg) return alert("Both fields required.");

                        try {
                            const res = await fetch(`/api/forum/posts/${post._id}`, {
                                method: "PATCH",
                                headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${token}`
                                },
                                body: JSON.stringify({ title: newTitle, message: newMsg })
                            });
                            if (res.ok) loadPosts();
                            else alert("Failed to update post.");
                        } catch (err) {
                            console.error("Edit error:", err);
                        }
                    });

                    postContent.querySelector(".cancel-edit-btn").addEventListener("click", () => {
                        renderPosts();
                    });
                });
            });

            postDiv.querySelectorAll(".delete-btn").forEach(btn => {
                btn.addEventListener("click", () => {
                    if (confirm("Delete this post?")) {
                        fetch(`/api/forum/posts/${post._id}`, {
                            method: "DELETE",
                            headers: { Authorization: `Bearer ${token}` }
                        }).then(res => res.ok ? loadPosts() : alert("Failed to delete post."));
                    }
                });
            });

            container.appendChild(postDiv);
        });

        const totalPages = Math.ceil(allPosts.length / postsPerPage);
        if (totalPages > 1) renderPagination(totalPages);
    };

    const loadPosts = async () => {
        try {
            const response = await fetch(`/api/forum/category/${encodeURIComponent(decodedTopic)}`);
            allPosts = await response.json();
            renderPosts();
        } catch (err) {
            console.error("Error loading posts:", err);
        }
    };

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

    loadPosts();
});