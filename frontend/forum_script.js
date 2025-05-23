document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const form = document.getElementById('post-form');
    const topicSections = {
        'Training Tips': document.getElementById('section-training'),
        'Gear Recommendations': document.getElementById('section-gear'),
        'Race Advice': document.getElementById('section-race'),
        'Meetup Requests': document.getElementById('section-meetup'),
        'General Chat': document.getElementById('section-chat')
    };

    async function fetchPosts() {
        try {
            const res = await fetch('https://ultramarathon-finder-backend.onrender.com/api/forum/posts');
            const posts = await res.json();

            for (const section of Object.values(topicSections)) {
                section.innerHTML = '';
            }

            posts.reverse().forEach(post => {
                const postElement = createPostCard(post);
                const section = topicSections[post.topic];
                if (section) section.appendChild(postElement);
            });
        } catch (err) {
            console.error('Error loading posts:', err);
        }
    }

    function createPostCard(post) {
        const div = document.createElement('div');
        div.className = 'post-card';
        div.style.animation = "fadeIn 0.5s ease";
        div.innerHTML = `
            <h4>${post.title}</h4>
            <p>${post.message}</p>
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

    fetchPosts();
});
