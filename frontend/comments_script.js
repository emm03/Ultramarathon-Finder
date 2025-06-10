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

            if (!post) {
                postDetails.innerHTML = `<p>Unable to load post.</p>`;
                return;
            }

            postDetails.innerHTML = `
                <div class="post-card">
                    <div class="post-header">
                        <img class="avatar" src="${post.profilePicture || './images/default-profile.png'}" alt="Avatar">
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

                const isOwner = comment.isOwner || (comment.username === localStorage.getItem('username'));

                div.innerHTML = `
                    <h4>${comment.username} <small>${new Date(comment.createdAt).toLocaleString()}</small></h4>
                    <p class="comment-content">${comment.content}</p>
                    <div class="comment-actions">
                        ${isOwner ? `
                            <button class="edit-comment-btn" data-id="${comment._id}">✏️ Edit</button>
                            <button class="delete-comment-btn" data-id="${comment._id}">🗑️ Delete</button>
                        ` : ''}
                        <button class="reply-btn" data-id="${comment._id}">💬 Reply</button>
                    </div>
                    <div class="reply-form" data-id="${comment._id}" style="display:none;">
                        <input type="text" class="reply-input" placeholder="Write a reply..." />
                        <button class="submit-reply-btn" data-id="${comment._id}">Post Reply</button>
                    </div>
                    <div class="replies" data-id="${comment._id}">
                        ${(comment.replies || []).map(reply => `
                            <div class="reply-card">
                                <strong>${reply.username}</strong>: ${reply.content}
                            </div>
                        `).join('')}
                    </div>
                `;

                commentList.appendChild(div);
            });
        } catch (error) {
            console.error("Error loading comments:", error);
        }
    }

    commentList.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;

        if (e.target.classList.contains('delete-comment-btn')) {
            if (!confirm('Delete this comment?')) return;
            try {
                const res = await fetch(`https://ultramarathon-finder-backend.onrender.com/api/forum/comment/${id}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) fetchComments();
            } catch (err) {
                console.error('Error deleting comment:', err);
            }
        }

        if (e.target.classList.contains('edit-comment-btn')) {
            const contentEl = e.target.closest('.comment-card').querySelector('.comment-content');
            const currentText = contentEl.textContent;
            const newText = prompt("Edit your comment:", currentText);
            if (!newText || newText === currentText) return;

            try {
                const res = await fetch(`https://ultramarathon-finder-backend.onrender.com/api/forum/comment/${id}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ content: newText })
                });
                if (res.ok) fetchComments();
            } catch (err) {
                console.error('Error editing comment:', err);
            }
        }

        if (e.target.classList.contains('reply-btn')) {
            const form = commentList.querySelector(`.reply-form[data-id="${id}"]`);
            if (form) form.style.display = 'block';
        }

        if (e.target.classList.contains('submit-reply-btn')) {
            const input = commentList.querySelector(`.reply-form[data-id="${id}"] .reply-input`);
            const content = input.value.trim();
            if (!content) return alert("Reply cannot be empty.");

            try {
                const res = await fetch(`https://ultramarathon-finder-backend.onrender.com/api/forum/comment/${id}/reply`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ content })
                });

                if (res.ok) fetchComments();
            } catch (err) {
                console.error("Error posting reply:", err);
            }
        }
    });

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
