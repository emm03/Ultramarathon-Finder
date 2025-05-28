// alanai_chatbot/alan.js

document.addEventListener("DOMContentLoaded", () => {
    const alanBubble = document.getElementById("alan-bubble");
    const alanWindow = document.getElementById("alan-window");
    const alanForm = document.getElementById("alan-form");
    const alanInput = document.getElementById("alan-input");
    const alanMessages = document.getElementById("alan-messages");

    alanBubble.addEventListener("click", () => {
        alanWindow.style.display = alanWindow.style.display === "block" ? "none" : "block";
    });

    alanForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const userMsg = alanInput.value.trim();
        if (!userMsg) return;

        displayMessage("user", userMsg);
        alanInput.value = "";

        const alanReply = await getAlanReply(userMsg);
        displayMessage("alan", alanReply);
    });

    function displayMessage(sender, text) {
        const messageDiv = document.createElement("div");
        messageDiv.className = sender;
        messageDiv.textContent = text;
        alanMessages.appendChild(messageDiv);
        alanMessages.scrollTop = alanMessages.scrollHeight;
    }

    async function getAlanReply(input) {
        try {
            const res = await fetch("https://ultramarathon-finder-backend.onrender.com/api/alan", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ prompt: input })
            });

            const data = await res.json();
            return data.reply || "I'm not sure how to help with that.";
        } catch (err) {
            console.error(err);
            return "Oops! Something went wrong. Try again later.";
        }
    }
});
