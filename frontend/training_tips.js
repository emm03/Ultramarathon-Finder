document.addEventListener("DOMContentLoaded", () => {
    const commentForm = document.getElementById("commentForm");
    const commentsContainer = document.getElementById("commentsContainer");
    const forumName = "training_tips"; // Forum identifier

    // Fetch and display comments
    async function fetchComments() {
        try {
            console.log(`Fetching comments for forum: ${forumName}`);
            const response = await fetch(`https://ultramarathon-finder-backend.onrender.com/api/forum/${forumName}/comments`);
            if (!response.ok) {
                console.error("Error fetching comments. Status:", response.status);
                alert(`Failed to fetch comments. Status code: ${response.status}`);
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

                // Load replies for the comment
                fetchReplies(comment._id);
            });

            console.log("Comments loaded successfully.");
        } catch (error) {
            console.error("Error fetching comments:", error);
            alert("An unexpected error occurred while fetching comments.");
        }
    }

    // Post a new comment
    commentForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const content = document.getElementById("commentContent").value.trim();

        const token = localStorage.getItem("token");
        if (!token) {
            alert("User is not authenticated. Please login.");
            return;
        }

        if (!content) {
            alert("Comment content cannot be empty.");
            return;
        }

        console.log("Submitting comment:", content);

        try {
            const response = await fetch(`https://ultramarathon-finder-backend.onrender.com/api/forum/${forumName}/comment`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}` // Ensure token is sent
                },
                body: JSON.stringify({ content }),
            });

            if (response.ok) {
                console.log("Comment posted successfully.");
                commentForm.reset();
                fetchComments(); // Reload comments after posting
            } else {
                const errorData = await response.json();
                console.error("Error posting comment:", errorData);
                alert(`Failed to post comment: ${errorData.message}`);
            }
        } catch (error) {
            console.error("Error posting comment:", error);
            alert("An unexpected error occurred while posting the comment.");
        }
    });

    // Fetch replies for a specific comment
    async function fetchReplies(commentId) {
        try {
            console.log(`Fetching replies for comment ID: ${commentId}`);
            const response = await fetch(`https://ultramarathon-finder-backend.onrender.com/api/forum/comment/${commentId}/replies`);
            if (!response.ok) {
                console.error("Error fetching replies. Status:", response.status);
                alert(`Failed to fetch replies. Status code: ${response.status}`);
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

            console.log("Replies loaded successfully.");
        } catch (error) {
            console.error("Error fetching replies:", error);
            alert("An unexpected error occurred while fetching replies.");
        }
    }

    // Show reply form for a specific comment
    function showReplyForm(commentId) {
        const repliesContainer = document.getElementById(`replies-${commentId}`);
        // Prevent multiple forms from being added
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

    // Post a reply to a specific comment
    async function postReply(event, commentId) {
        event.preventDefault();
        const content = event.target.querySelector("textarea").value.trim();

        const token = localStorage.getItem("token");
        if (!token) {
            alert("User is not authenticated. Please login.");
            return;
        }

        if (!content) {
            alert("Reply content cannot be empty.");
            return;
        }

        console.log(`Posting reply to comment ID: ${commentId}, content: ${content}`);

        try {
            const response = await fetch(`https://ultramarathon-finder-backend.onrender.com/api/forum/comment/${commentId}/reply`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}` // Ensure token is sent
                },
                body: JSON.stringify({ content }),
            });

            if (response.ok) {
                console.log("Reply posted successfully.");
                fetchReplies(commentId); // Reload replies after posting
            } else {
                const errorData = await response.json();
                console.error("Error posting reply:", errorData);
                alert(`Failed to post reply: ${errorData.message}`);
            }
        } catch (error) {
            console.error("Error posting reply:", error);
            alert("An unexpected error occurred while posting the reply.");
        }
    }

    // Like a comment
    commentsContainer.addEventListener("click", async (event) => {
        if (event.target.classList.contains("like-btn")) {
            const commentId = event.target.dataset.id;

            const token = localStorage.getItem("token");
            if (!token) {
                alert("User is not authenticated. Please login.");
                return;
            }

            console.log(`Liking comment with ID: ${commentId}`);

            try {
                const response = await fetch(`https://ultramarathon-finder-backend.onrender.com/api/forum/comment/${commentId}/like`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}` // Ensure token is sent
                    }
                });

                if (response.ok) {
                    console.log("Comment liked successfully.");
                    fetchComments(); // Reload comments after liking
                } else {
                    const errorData = await response.json();
                    console.error("Error liking comment:", errorData);
                    alert(`Failed to like comment: ${errorData.message}`);
                }
            } catch (error) {
                console.error("Error liking comment:", error);
                alert("An unexpected error occurred while liking the comment.");
            }
        } else if (event.target.classList.contains("reply-btn")) {
            const commentId = event.target.dataset.id;
            showReplyForm(commentId);
        }
    });

    // Initial load
    fetchComments();
});
