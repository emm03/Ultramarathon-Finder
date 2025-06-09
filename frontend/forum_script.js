// forum_script.js

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

    const categoryCards = document.querySelectorAll('.category-card');

    // Scroll to section on category click
    categoryCards.forEach(card => {
        card.addEventListener('click', () => {
            const topic = card.dataset.topic;
            const section = topicSections[topic];
            if (section) {
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // Highlight active category card on scroll
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
        section.dataset.topic = topic;
        observer.observe(section);
    });

    async function fetchPosts(sortBy = 'recent') {
        try {
            const res = await fetch(`https://ultramarathon-finder-backend.onrender.com/api/forum/posts?sort=${sortBy}`);
            const result = await res.json();
            const posts = result.posts || result;

            for (const section of Object.values(topicSections)) {
                section.innerHTML = '';
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
        div.innerHTML = `
        <div class="post-header">
          <img class="avatar" src="${post.profilePicture || './images/default-profile.png'}" alt="User Avatar">
          <div class="meta">
            <strong>${post.username || 'Anonymous'}</strong><br>
            <small>${new Date(post.createdAt || post.timestamp).toLocaleString()}</small>
          </div>
        </div>
        <h4>${post.title}</h4>
        <p>${post.message}</p>
        <div class="post-actions">
          <button class="reaction-btn" data-id="${post._id}">🔥 ${post.reactions || 0}</button>
          <button class="comment-btn" onclick="window.location.href='comments.html?postId=${post._id}'">💬 Reply</button>
        </div>
        <span class="post-meta">Posted in <strong>${post.topic}</strong></span>
      `;
        return div;
    }

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

    document.addEventListener('click', async (e) => {
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

    if (sortToggle) {
        sortToggle.addEventListener('change', () => {
            const sortBy = sortToggle.value;
            fetchPosts(sortBy);
        });
    }

    fetchPosts();

    // JOIN GROUP LOGIC
    const joinButtons = document.querySelectorAll(".join-btn");

    joinButtons.forEach((btn) => {
        btn.addEventListener("click", async () => {
            const groupName = btn.closest(".training-group").querySelector("h4")?.textContent;
            if (!token) return alert("Please log in to join a group.");

            try {
                const res = await fetch("https://ultramarathon-finder-backend.onrender.com/api/auth/join-group", {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ groupName })
                });

                if (res.ok) {
                    btn.textContent = "Joined ✅";
                    btn.disabled = true;
                    btn.classList.add("joined");
                } else {
                    const err = await res.json();
                    alert(err.message || "Failed to join group.");
                }
            } catch (err) {
                console.error("Error joining group:", err);
                alert("Network error while joining group.");
            }
        });
    });

    // PRE-MARK JOINED GROUPS
    (async function markJoinedGroups() {
        if (!token) return;

        try {
            const res = await fetch("https://ultramarathon-finder-backend.onrender.com/api/auth/account", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const data = await res.json();
            const joined = data?.user?.joinedGroups || [];

            document.querySelectorAll(".training-group").forEach(group => {
                const title = group.querySelector("h4")?.textContent.trim();
                const button = group.querySelector(".join-btn");

                if (joined.includes(title)) {
                    button.textContent = "Joined ✅";
                    button.disabled = true;
                    button.classList.add("joined");
                }
            });
        } catch (err) {
            console.error("Failed to fetch joined groups:", err);
        }
    })();
});
