// forum_script.js

// This script handles posting and fetching forum messages
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("post-form");
    const discussionsContainer = document.getElementById("discussions-container");
  
    // Fetch posts on page load
    fetchPosts();
  
    // Handle new post submission
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
  
      const username = document.getElementById("username").value.trim();
      const category = document.getElementById("category").value;
      const content = document.getElementById("content").value.trim();
  
      if (!username || !content) {
        alert("Please fill in all fields.");
        return;
      }
  
      try {
        const res = await fetch("/api/forum/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, category, content })
        });
  
        if (!res.ok) throw new Error("Failed to post message.");
  
        // Clear and reload posts
        form.reset();
        fetchPosts();
      } catch (error) {
        console.error(error);
        alert("Error posting message.");
      }
    });
  
    // Load and display forum posts
    async function fetchPosts() {
      try {
        const res = await fetch("/api/forum/posts");
        const posts = await res.json();
  
        discussionsContainer.innerHTML = "";
        posts.reverse().forEach((post) => {
          const postElement = document.createElement("div");
          postElement.className = "forum-post";
          postElement.innerHTML = `
            <h4>${post.category}</h4>
            <p>${post.content}</p>
            <small>Posted by <strong>${post.username}</strong> on ${new Date(post.createdAt).toLocaleString()}</small>
          `;
          discussionsContainer.appendChild(postElement);
        });
      } catch (error) {
        console.error("Error loading posts:", error);
        discussionsContainer.innerHTML = "<p>Unable to load posts.</p>";
      }
    }
  });
  