const forumName = "gear_forum"; // Forum identifier

// Fetch comments from the backend
async function fetchComments() {
    try {
        const response = await fetch(`https://ultra-finder-backend-f3b8ba349529.herokuapp.com/api/forum/comments/${forumName}`);
        if (!response.ok) {
            console.error("Error fetching comments. Status:", response.status);
            alert(`Failed to fetch comments. Status code: ${response.status}`);
            return;
        }
        const comments = await response.json();
        const commentsContainer = document.getElementById("commentsContainer");
        commentsContainer.innerHTML = ""; // Clear existing comments

        comments.forEach(comment => {
            const commentDiv = document.createElement("div");
            commentDiv.classList.add("comment");
            commentDiv.innerHTML = `
                <h4>${comment.username}</h4>
                <small>${new Date(comment.timestamp).toLocaleString()}</small>
                <p>${comment.content}</p>
                <div class="comment-actions">
                    <button class="reply-btn" onclick="showReplyForm('${comment._id}')">Reply</button>
                    <button class="like-btn" onclick="likeComment('${comment._id}')">Like (${comment.likes || 0})</button>
                </div>
                <div id="replies-${comment._id}" class="replies"></div>
            `;
            commentsContainer.appendChild(commentDiv);

            // Load replies for the comment
            fetchReplies(comment._id);
        });
    } catch (error) {
        console.error("Error fetching comments:", error);
        alert("An unexpected error occurred while fetching comments.");
    }
}

// Post a new comment
async function postComment(event) {
    event.preventDefault();
    const content = document.getElementById("commentContent").value.trim();

    if (!content) {
        alert("Comment content cannot be empty.");
        return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
        alert("User is not authenticated. Please login.");
        return;
    }
    console.log("Token being used for posting comment:", token);

    try {
        const response = await fetch("https://ultra-finder-backend-f3b8ba349529.herokuapp.com/api/forum/comments", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ content, forum: forumName }),
        });

        if (response.ok) {
            console.log("Comment posted successfully.");
            document.getElementById("commentForm").reset();
            fetchComments(); // Reload comments after posting
        } else {
            console.error("Error posting comment. Status:", response.status);
            const errorData = await response.text();
            console.error("Response text:", errorData);
            alert(`Failed to post comment. Status code: ${response.status}. Message: ${errorData}`);
        }
    } catch (error) {
        console.error("Error posting comment:", error);
        alert("An unexpected error occurred while posting the comment.");
    }
}

// Fetch replies for a specific comment
async function fetchReplies(commentId) {
    try {
        const response = await fetch(`https://ultra-finder-backend-f3b8ba349529.herokuapp.com/api/forum/comments/${commentId}/replies`);
        if (!response.ok) {
            console.error("Error fetching replies. Status:", response.status);
            alert(`Failed to fetch replies. Status code: ${response.status}`);
            return;
        }
        const replies = await response.json();
        const repliesContainer = document.getElementById(`replies-${commentId}`);
        repliesContainer.innerHTML = ""; // Clear existing replies

        replies.forEach(reply => {
            const replyDiv = document.createElement("div");
            replyDiv.classList.add("reply");
            replyDiv.innerHTML = `
                <h4>${reply.username}</h4>
                <small>${new Date(reply.timestamp).toLocaleString()}</small>
                <p>${reply.content}</p>
            `;
            repliesContainer.appendChild(replyDiv);
        });
    } catch (error) {
        console.error("Error fetching replies:", error);
        alert("An unexpected error occurred while fetching replies.");
    }
}

// Show reply form for a specific comment
function showReplyForm(commentId) {
    const repliesContainer = document.getElementById(`replies-${commentId}`);
    // Clear previous reply forms
    document.querySelectorAll(".reply-form").forEach(form => form.remove());

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

    if (!content) {
        alert("Reply content cannot be empty.");
        return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
        alert("User is not authenticated. Please login.");
        return;
    }
    console.log("Token being used for posting reply:", token);

    try {
        const response = await fetch(`https://ultra-finder-backend-f3b8ba349529.herokuapp.com/api/forum/comments/${commentId}/reply`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ content }),
        });

        if (response.ok) {
            console.log("Reply posted successfully.");
            fetchReplies(commentId); // Reload replies after posting
        } else {
            console.error("Error posting reply. Status:", response.status);
            const errorData = await response.text();
            console.error("Response text:", errorData);
            alert(`Failed to post reply. Status code: ${response.status}. Message: ${errorData}`);
        }
    } catch (error) {
        console.error("Error posting reply:", error);
        alert("An unexpected error occurred while posting the reply.");
    }
}

// Like a comment
async function likeComment(commentId) {
    const token = localStorage.getItem("token");
    if (!token) {
        alert("User is not authenticated. Please login.");
        return;
    }
    console.log("Token being used for liking comment:", token);

    try {
        const response = await fetch(`https://ultra-finder-backend-f3b8ba349529.herokuapp.com/api/forum/comments/${commentId}/like`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (response.ok) {
            console.log("Comment liked successfully.");
            fetchComments(); // Reload comments after liking
        } else {
            console.error("Error liking comment. Status:", response.status);
            const errorData = await response.text();
            console.error("Response text:", errorData);
            alert(`Failed to like comment. Status code: ${response.status}. Message: ${errorData}`);
        }
    } catch (error) {
        console.error("Error liking comment:", error);
        alert("An unexpected error occurred while liking the comment.");
    }
}

// Add event listeners
document.getElementById("commentForm").addEventListener("submit", postComment);
fetchComments(); // Load comments on page load
