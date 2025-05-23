// comments_script.js

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('postId');
    const token = localStorage.getItem('token');
    const commentForm = document.getElementById('comment-form');
    const commentInput = document.getElementById('comment-input');
    const commentsContainer = document.getElementById('comments-container');
  
    async function fetchComments() {
      try {
        const res = await fetch(`https://ultramarathon-finder-backend.onrender.com/api/forum/comments/${postId}`);
        const data = await res.json();
        commentsContainer.innerHTML = "";
  
        data.comments.forEach(comment => {
          const div = document.createElement('div');
          div.className = 'comment-card';
          div.innerHTML = `
            <h4>${comment.username} <small>${new Date(comment.createdAt).toLocaleString()}</small></h4>
            <p>${comment.content}</p>
          `;
          commentsContainer.appendChild(div);
        });
      } catch (error) {
        console.error("Error loading comments:", error);
      }
    }
  
    if (commentForm) {
      commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = commentInput.value.trim();
        if (!content || !token) return;
  
        try {
          const res = await fetch(`https://ultramarathon-finder-backend.onrender.com/api/forum/comments/${postId}`, {
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
          }
        } catch (error) {
          console.error("Error posting comment:", error);
        }
      });
    }
  
    fetchComments();
  });
  