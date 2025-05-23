// comments_script.js

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('postId');
    const token = localStorage.getItem('token');

    const postDetails = document.getElementById('post-details');
    const commentForm = document.getElementById('comment-form');
    const commentInput = document.getElementById('comment-content');
    const commentList = document.getElementById('comment-list');
    const commentError = document.getElementById('comment-error');

    async function fetchPost() {
        try {
            const res = await fetch(`https://ultramarathon-finder-backend.onrender.com/api/forum/posts/${postId}`);
            const { post } = await res.json();

            postDetails.innerHTML = `
          <div class="post-card">
            <div class="post-header">
              <img class="avatar" src="${post.profilePicture || 'images/default-profile.png'}" alt="Avatar">
              <div class="meta">
                <strong>${post.username || 'Anonymous'}</strong><br>
                <small>${new Date(post.createdAt).toLocaleString()}</small>
              </div>
            </div>
            <h4>${post.title}</h4>
            <p>${post.message}</p>
          </div>
        `;
        } catch (err) {
            postDetails.innerHTML = `<p>Unable to load post.</p>`;
            console.error("Error loading post:", err);
        }
    }

    async function fetchComments() {
        try {
            const res = await fetch(`https://ultramarathon-finder-backend.onrender.com/api/forum/${postId}/comments`);
            const { comments } = await res.json();

            commentList.innerHTML = "";

            comments.forEach(comment => {
                const div = document.createElement('div');
                div.className = 'comment-card';
                div.innerHTML = `
            <h4>${comment.username} <small>${new Date(comment.createdAt).toLocaleString()}</small></h4>
            <p>${comment.content}</p>
          `;
                commentList.appendChild(div);
            });
        } catch (error) {
            console.error("Error loading comments:", error);
        }
    }

    if (commentForm) {
        commentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const content = commentInput.value.trim();
            commentError.textContent = '';

            if (!token) {
                commentError.textContent = 'You must be logged in.';
                return;
            }
            if (!content) {
                commentError.textContent = 'Comment cannot be empty.';
                return;
            }

            try {
                const res = await fetch(`https://ultramarathon-finder-backend.onrender.com/api/forum/${postId}/comment`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ content })
                });

                if (res.ok) {
                    commentInput.value = '';
                    fetchComments();
                } else {
                    const data = await res.json();
                    commentError.textContent = data.message || 'Failed to post comment.';
                }
            } catch (error) {
                commentError.textContent = 'Error posting comment.';
                console.error("Error posting comment:", error);
            }
        });
    }

    fetchPost();
    fetchComments();
});
