document.addEventListener("DOMContentLoaded", () => {
    const bubble = document.getElementById("alan-bubble");
    const windowBox = document.getElementById("alan-window");
    const form = document.getElementById("alan-form");
    const input = document.getElementById("alan-input");
    const messages = document.getElementById("alan-messages");

    // Starter prompts
    const starterPrompts = [
        "Find me a 100k in the fall",
        "Any races in Europe this summer?",
        "What’s a good beginner ultramarathon?",
    ];

    // Show welcome suggestions
    const showWelcome = () => {
        messages.innerHTML = `
            <div class="alan-welcome">
                <p><strong>Hi, I’m Alan! 🏃‍♂️</strong></p>
                <p>Here are a few things you can ask me:</p>
                <ul>
                    ${starterPrompts.map(p => `<li>• ${p}</li>`).join("")}
                </ul>
            </div>
        `;
    };

    bubble.addEventListener("click", () => {
        windowBox.classList.toggle("open");
        if (windowBox.classList.contains("open") && messages.innerHTML.trim() === "") {
            showWelcome();
        }
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const userMessage = input.value.trim();
        if (!userMessage) return;

        messages.innerHTML += `<div class="alan-msg user-msg"><strong>You:</strong> ${userMessage}</div>`;
        input.value = "";

        // Show typing indicator
        const typingEl = document.createElement("div");
        typingEl.className = "alan-msg alan-typing";
        typingEl.innerHTML = `<em>Alan is typing<span class="dots">...</span></em>`;
        messages.appendChild(typingEl);
        messages.scrollTop = messages.scrollHeight;

        try {
            const response = await fetch("https://ultramarathon-finder-backend.onrender.com/api/alan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userMessage }),
            });
            const data = await response.json();

            // Remove typing indicator
            typingEl.remove();

            // Show Alan's reply
            messages.innerHTML += `<div class="alan-msg alan-reply"><strong>Alan:</strong> ${data.reply}</div>`;
            messages.scrollTop = messages.scrollHeight;
        } catch (error) {
            typingEl.remove();
            messages.innerHTML += `<div class="alan-msg alan-reply"><strong>Alan:</strong> Sorry, there was an error.</div>`;
        }
    });
});