document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const topic = urlParams.get("topic");
    const decodedTopic = decodeURIComponent(topic);
    document.getElementById("category-title").textContent = decodedTopic;
    document.getElementById("post-topic").value = decodedTopic;

    const loadPosts = async () => {
        try {
            const response = await fetch(`/api/forum/category/${encodeURIComponent(topic)}`);
            const posts = await response.json();

            const container = document.getElementById("posts-container");
            container.innerHTML = "";

            posts.forEach(post => {
                const postDiv = document.createElement("div");
                postDiv.className = "post-card";
                postDiv.innerHTML = `
            <h3>${post.title}</h3>
            <p>${post.message}</p>
            <p class="post-meta">Posted by ${post.username}</p>
          `;
                container.appendChild(postDiv);
            });

            if (posts.length === 0) {
                container.innerHTML = "<p>No posts yet in this category. Be the first to post!</p>";
            }
        } catch (err) {
            console.error("Error loading posts:", err);
        }
    };

    loadPosts();

    document.getElementById("post-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const title = document.getElementById("post-title").value.trim();
        const message = document.getElementById("post-message").value.trim();
        const topic = document.getElementById("post-topic").value;
        const token = localStorage.getItem("token");

        if (!title || !message || !topic) {
            document.getElementById("form-error").textContent = "All fields are required.";
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
                document.getElementById("form-error").textContent = data.message || "Error submitting post.";
            } else {
                document.getElementById("post-form").reset();
                document.getElementById("form-error").textContent = "";
                loadPosts();
            }
        } catch (err) {
            console.error("Error submitting post:", err);
            document.getElementById("form-error").textContent = "Failed to submit post.";
        }
    });
});
