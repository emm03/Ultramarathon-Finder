document.addEventListener("DOMContentLoaded", () => {
    const commentForm = document.getElementById("commentForm");
    const commentsContainer = document.getElementById("commentsContainer");
    const forumName = "race_experiences"; // Forum identifier

    // Fetch and display comments
    async function fetchComments() {
        try {
            const response = await fetch(`https://ultramarathon-finder-backend.onrender.com/api/forum/${forumName}/comments`);
            if (!response.ok) {
                console.error(`Error fetching comments. Status: ${response.status}`);
                return;
            }

            const { comments } = await response.json();
            commentsContainer.innerHTML = ""; // Clear existing comments

            comments.forEach((comment) => {
                const commentDiv = document.createElement("div");
                commentDiv.classList.add("comment");
                commentDiv.innerHTML = `
                    <h4>${comment.username} <small>${new Date(comment.timestamp).toLocaleString()}</small></h4>
                    <p>${comment.content}</p>
                    <div class="comment-actions">
                        <button class="like-btn" data-id="${comment._id}">Like (${comment.likes || 0})</button>
                        <button class="reply-btn" data-id="${comment._id}">Reply</button>
                    </div>
                    <div id="replies-${comment._id}" class="replies"></div>
                `;
                commentsContainer.appendChild(commentDiv);

                fetchReplies(comment._id); // Load replies for the comment
            });
        } catch (error) {
            console.error("Error fetching comments:", error);
        }
    }

    // Post a new comment
    commentForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const content = document.getElementById("commentContent").value.trim();

        if (!content) {
            alert("Comment content cannot be empty.");
            return;
        }

        const token = localStorage.getItem("token");
        if (!token) {
            alert("You must log in to post a comment.");
            return;
        }

        try {
            const response = await fetch(`https://ultramarathon-finder-backend.onrender.com/api/forum/${forumName}/comment`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ content }),
            });

            if (response.ok) {
                commentForm.reset();
                fetchComments(); // Reload comments
            } else {
                const { message } = await response.json();
                alert(`Failed to post comment: ${message}`);
            }
        } catch (error) {
            console.error("Error posting comment:", error);
        }
    });

    // Fetch replies for a specific comment
    async function fetchReplies(commentId) {
        try {
            const response = await fetch(`https://ultramarathon-finder-backend.onrender.com/api/forum/comment/${commentId}/replies`);
            if (!response.ok) {
                console.error(`Error fetching replies for comment ${commentId}. Status: ${response.status}`);
                return;
            }

            const replies = await response.json();
            const repliesContainer = document.getElementById(`replies-${commentId}`);
            repliesContainer.innerHTML = ""; // Clear existing replies

            replies.forEach((reply) => {
                const replyDiv = document.createElement("div");
                replyDiv.classList.add("reply");
                replyDiv.innerHTML = `
                    <h4>${reply.username} <small>${new Date(reply.timestamp).toLocaleString()}</small></h4>
                    <p>${reply.content}</p>
                `;
                repliesContainer.appendChild(replyDiv);
            });
        } catch (error) {
            console.error(`Error fetching replies for comment ${commentId}:`, error);
        }
    }

    // Post a reply to a specific comment
    async function postReply(event, commentId) {
        event.preventDefault();
        const content = event.target.querySelector("textarea").value.trim();

        if (!content) {
            alert("Reply content cannot be empty.");
            return;
        }

        const token = localStorage.getItem("token");
        if (!token) {
            alert("You must log in to post a reply.");
            return;
        }

        try {
            const response = await fetch(`https://ultramarathon-finder-backend.onrender.com/api/forum/comment/${commentId}/reply`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ content }),
            });

            if (response.ok) {
                fetchReplies(commentId); // Reload replies
            } else {
                const { message } = await response.json();
                alert(`Failed to post reply: ${message}`);
            }
        } catch (error) {
            console.error(`Error posting reply to comment ${commentId}:`, error);
        }
    }

    // Show reply form for a specific comment
    function showReplyForm(commentId) {
        const repliesContainer = document.getElementById(`replies-${commentId}`);
        if (repliesContainer.querySelector(".reply-form")) return;

        const replyForm = document.createElement("form");
        replyForm.classList.add("reply-form");
        replyForm.innerHTML = `
            <textarea placeholder="Write your reply..." required></textarea>
            <button type="submit">Post Reply</button>
        `;
        replyForm.onsubmit = (event) => postReply(event, commentId);
        repliesContainer.appendChild(replyForm);
    }

    // Like a comment
    commentsContainer.addEventListener("click", async (event) => {
        if (event.target.classList.contains("like-btn")) {
            const commentId = event.target.dataset.id;

            const token = localStorage.getItem("token");
            if (!token) {
                alert("You must log in to like a comment.");
                return;
            }

            try {
                const response = await fetch(`https://ultramarathon-finder-backend.onrender.com/api/forum/comment/${commentId}/like`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    fetchComments(); // Reload comments
                } else {
                    const { message } = await response.json();
                    alert(`Failed to like comment: ${message}`);
                }
            } catch (error) {
                console.error(`Error liking comment ${commentId}:`, error);
            }
        } else if (event.target.classList.contains("reply-btn")) {
            const commentId = event.target.dataset.id;
            showReplyForm(commentId);
        }
    });

    // Initial load
    fetchComments();
});

