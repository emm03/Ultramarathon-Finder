document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const form = document.getElementById('post-form');
    const sortToggle = document.getElementById('sort-toggle');

    const topicSections = {
        'Training Tips': document.getElementById('section-training'),
        'Gear Recommendations': document.getElementById('section-gear'),
        'Race Advice': document.getElementById('section-race'),
        'Meetup Requests': document.getElementById('section-meetup'),
        'General Chat': document.getElementById('section-chat')
    };

    document.addEventListener('click', async (e) => {
        console.log("Clicked element:", e.target);
        // DELETE POST
        if (e.target.classList.contains('delete-btn')) {
            console.log("Delete button clicked");
            const postId = e.target.dataset.id;
            if (confirm("Are you sure you want to delete this post?")) {
                try {
                    const res = await fetch(`https://ultramarathon-finder-backend.onrender.com/api/forum/posts/${postId}`, {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (res.ok) fetchPosts();
                    else alert("Failed to delete post.");
                } catch (err) {
                    console.error("Error deleting post:", err);
                }
            }
        }

        // EDIT POST
        if (e.target.classList.contains('edit-btn')) {
            console.log("Edit button clicked");
            const postId = e.target.dataset.id;
            const oldTitle = e.target.dataset.title;
            const oldMsg = e.target.dataset.message;

            const newTitle = prompt("Edit post title:", oldTitle);
            const newMessage = prompt("Edit post message:", oldMsg);
            if (!newTitle || !newMessage) return;

            try {
                const res = await fetch(`https://ultramarathon-finder-backend.onrender.com/api/forum/posts/${postId}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ title: newTitle, message: newMessage })
                });
                if (res.ok) fetchPosts();
                else alert("Failed to edit post.");
            } catch (err) {
                console.error("Error editing post:", err);
            }
        }

        // REACT TO POST
        if (e.target.classList.contains('reaction-btn')) {
            const postId = e.target.dataset.id;
            if (!token) return alert('Login to react!');

            try {
                const res = await fetch(`https://ultramarathon-finder-backend.onrender.com/api/forum/posts/${postId}/react`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    fetchPosts();
                }
            } catch (err) {
                console.error('Reaction error:', err);
            }
        }
    });

    const categoryCards = document.querySelectorAll('.category-card');
    categoryCards.forEach(card => {
        card.addEventListener('click', () => {
            const topic = card.dataset.topic;
            const section = topicSections[topic];
            if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                categoryCards.forEach(card => {
                    card.classList.remove('active-category');
                    if (card.dataset.topic === entry.target.dataset.topic) {
                        card.classList.add('active-category');
                    }
                });
            }
        });
    }, { threshold: 0.3 });

    Object.entries(topicSections).forEach(([topic, section]) => {
        if (section) {
            section.dataset.topic = topic;
            observer.observe(section);
        }
    });

    async function fetchPosts(sortBy = 'recent') {
        try {
            const res = await fetch(`https://ultramarathon-finder-backend.onrender.com/api/forum/posts?sort=${sortBy}`);
            const result = await res.json();
            const posts = result.posts || result;

            for (const section of Object.values(topicSections)) {
                if (section) section.innerHTML = '';
            }

            posts.forEach(post => {
                const normalizedTopic = post.topic.trim();
                const section = topicSections[normalizedTopic];
                if (section) {
                    const postEl = createPostCard(post);
                    section.appendChild(postEl);
                }
            });
        } catch (err) {
            console.error('Error loading posts:', err);
        }
    }

    function createPostCard(post) {
        const div = document.createElement('div');
        div.className = 'post-card';

        const isOwner = token && post.username && localStorage.getItem('username') === post.username;

        div.innerHTML = `
            <div class="post-header">
              <img class="avatar" src="${post.profilePicture || './images/default-profile.png'}" alt="User Avatar">
              <div class="meta">
                <strong>${post.username || 'Anonymous'}</strong><br>
                <small>${new Date(post.createdAt || post.timestamp).toLocaleString()}</small>
              </div>
            </div>
            <div class="post-content">
                <h4 class="post-title">${post.title}</h4>
                <textarea class="post-title-edit" style="display:none;">${post.title}</textarea>
                <p class="post-message">${post.message}</p>
                <textarea class="post-message-edit" style="display:none;">${post.message}</textarea>
            </div>
            <div class="post-actions">
              <button class="reaction-btn" data-id="${post._id}">🔥 ${post.reactions || 0}</button>
              <button class="comment-btn" onclick="window.location.href='comments.html?postId=${post._id}'">💬 Reply</button>
              ${isOwner ? `
                <button class="edit-btn" data-id="${post._id}">✏️ Edit</button>
                <button class="save-btn" data-id="${post._id}" style="display:none;">💾 Save</button>
                <button class="delete-btn" data-id="${post._id}">🗑️ Delete</button>` : ''
            }
            </div>
            <span class="post-meta">Posted in <strong>${post.topic}</strong></span>
        `;

        // Inline editing logic
        if (isOwner) {
            const editBtn = div.querySelector(".edit-btn");
            const saveBtn = div.querySelector(".save-btn");
            const titleEl = div.querySelector(".post-title");
            const titleInput = div.querySelector(".post-title-edit");
            const messageEl = div.querySelector(".post-message");
            const messageInput = div.querySelector(".post-message-edit");

            editBtn.addEventListener("click", () => {
                titleEl.style.display = "none";
                titleInput.style.display = "block";
                messageEl.style.display = "none";
                messageInput.style.display = "block";
                editBtn.style.display = "none";
                saveBtn.style.display = "inline-block";
            });

            saveBtn.addEventListener("click", async () => {
                const newTitle = titleInput.value.trim();
                const newMessage = messageInput.value.trim();
                const postId = saveBtn.dataset.id;

                if (!newTitle || !newMessage) return alert("Title and message cannot be empty.");

                try {
                    const res = await fetch(`https://ultramarathon-finder-backend.onrender.com/api/forum/posts/${postId}`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`
                        },
                        body: JSON.stringify({ title: newTitle, message: newMessage })
                    });

                    if (res.ok) {
                        fetchPosts();
                    } else {
                        alert("Failed to update post.");
                    }
                } catch (err) {
                    console.error("Edit post error:", err);
                }
            });
        }

        return div;
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const title = document.getElementById('post-title').value.trim();
            const message = document.getElementById('post-message').value.trim();
            const topic = document.getElementById('post-topic').value;
            const errorMsg = document.getElementById('form-error');
            errorMsg.textContent = '';

            if (!token) {
                errorMsg.textContent = 'You must be logged in to post.';
                return;
            }

            if (!title || !message || !topic) {
                errorMsg.textContent = 'All fields are required.';
                return;
            }

            try {
                const res = await fetch('https://ultramarathon-finder-backend.onrender.com/api/forum/posts', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ title, message, topic })
                });

                if (res.ok) {
                    form.reset();
                    fetchPosts();
                } else {
                    const data = await res.json();
                    errorMsg.textContent = data.message || 'Failed to post.';
                }
            } catch (err) {
                errorMsg.textContent = 'Something went wrong. Try again later.';
            }
        });
    }

    if (sortToggle) {
        sortToggle.addEventListener('change', () => {
            const sortBy = sortToggle.value;
            fetchPosts(sortBy);
        });
    }

    fetchPosts();

    // === GROUP BUTTON LOGIC ===
    const setupGroupButtons = async () => {
        if (!token) return;

        try {
            const res = await fetch("https://ultramarathon-finder-backend.onrender.com/api/auth/account", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            const joinedGroups = data?.user?.joinedGroups || [];

            document.querySelectorAll(".training-group").forEach(group => {
                const h4 = group.querySelector("h4");
                const btn = group.querySelector(".join-btn");
                if (!h4 || !btn) return;

                const groupName = h4.textContent.trim();
                const isJoined = joinedGroups.includes(groupName);
                updateButtonState(btn, isJoined);

                btn.onclick = async () => {
                    const endpoint = btn.classList.contains("joined") ? "leave-group" : "join-group";

                    try {
                        const response = await fetch(`https://ultramarathon-finder-backend.onrender.com/api/groups/${endpoint}`, {
                            method: "PATCH",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`
                            },
                            body: JSON.stringify({ groupName })
                        });

                        if (response.ok) {
                            const updatedJoined = endpoint === "join-group";
                            updateButtonState(btn, updatedJoined);
                        } else {
                            const err = await response.json();
                            alert(err.message || "Failed to update group status.");
                        }
                    } catch (error) {
                        console.error("Error toggling group status:", error);
                        alert("Network error.");
                    }
                };
            });
        } catch (err) {
            console.error("❌ Failed to load joined groups:", err);
        }
    };

    function updateButtonState(button, joined) {
        if (joined) {
            button.textContent = "Leave Group";
            button.classList.add("joined");
        } else {
            button.textContent = "Join Group";
            button.classList.remove("joined");
        }
    }

    // === LOAD DYNAMIC TRAINING GROUPS ===
    async function fetchTrainingGroups() {
        try {
            const res = await fetch("https://ultramarathon-finder-backend.onrender.com/api/groups/all-groups");
            const data = await res.json();
            const section = document.querySelector(".training-groups-section");
            const dynamicGroupContainer = document.getElementById("dynamic-training-groups");
            if (dynamicGroupContainer) dynamicGroupContainer.innerHTML = "";

            data.groups.forEach(group => {
                console.log("Group object:", group);  // Add this

                const div = document.createElement("div");
                div.className = "training-group";

                const name = group.groupName || group.title || group.raceName || "Unnamed Group";
                const encodedGroupName = encodeURIComponent(name);

                div.innerHTML = `
                  <h4><a href="forum/group_forum.html?group=${encodedGroupName}">${name}</a></h4>
                  <p>${group.description || "No description provided."}</p>
                  <button class="join-btn">Join Group</button>
                `;

                section.insertBefore(div, section.querySelector(".create-group-btn"));
            });

            setupGroupButtons();
        } catch (err) {
            console.error("Failed to fetch training groups:", err);
        }
    }

    fetchTrainingGroups();
});
