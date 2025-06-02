document.addEventListener("DOMContentLoaded", () => {
    const bubble = document.getElementById("alan-bubble");
    const windowBox = document.getElementById("alan-window");
    const form = document.getElementById("alan-form");
    const input = document.getElementById("alan-input");
    const messages = document.getElementById("alan-messages");
    const closeBtn = document.getElementById("alan-close-btn");

    const starterPrompts = [
        "Find me a 100k in the fall",
        "Any races in Europe this summer?",
        "What’s a good beginner ultramarathon?",
    ];

    const showWelcome = () => {
        messages.innerHTML = `
            <div class="alan-welcome">
                <p><strong>Hi, I’m Alan! 🏃‍♂️</strong></p>
                <p>You can ask me things like:</p>
                <ul class="alan-starters">
                    ${starterPrompts.map(p => `<li>${p}</li>`).join("")}
                </ul>
            </div>
        `;
    };

    let hasInteracted = false;

    bubble.addEventListener("click", async () => {
        windowBox.classList.toggle("open");

        if (windowBox.classList.contains("open") && messages.innerHTML.trim() === "") {
            showWelcome();
        }

        if (!hasInteracted && windowBox.classList.contains("open")) {
            hasInteracted = true;

            const userMessage = "hello";
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
                typingEl.remove();

                const replies = data.reply.split("||");

                replies.forEach(reply => {
                    const clean = escapeHtml(reply.trim());
                    const linked = convertLinks(clean);
                    messages.innerHTML += `
                        <div class="alan-msg alan-reply">
                            <div class="alan-box">
                                <strong>Alan:</strong><br>${linked}
                            </div>
                        </div>`;
                });

                messages.scrollTop = messages.scrollHeight;
            } catch (error) {
                typingEl.remove();
                messages.innerHTML += `<div class="alan-msg alan-reply"><strong>Alan:</strong> Sorry, there was an error.</div>`;
                messages.scrollTop = messages.scrollHeight;
            }
        }
    });

    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            windowBox.classList.remove("open");
        });
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const userMessage = input.value.trim();
        if (!userMessage) return;

        messages.innerHTML += `<div class="alan-msg user-msg"><strong>You:</strong> ${userMessage}</div>`;
        input.value = "";

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
            typingEl.remove();

            const replies = data.reply.split("||");

            replies.forEach(reply => {
                const clean = escapeHtml(reply.trim());
                const linked = convertLinks(clean);
                messages.innerHTML += `
                    <div class="alan-msg alan-reply">
                        <div class="alan-box">
                            <strong>Alan:</strong><br>${linked}
                        </div>
                    </div>`;
            });

            messages.scrollTop = messages.scrollHeight;
        } catch (error) {
            typingEl.remove();
            messages.innerHTML += `<div class="alan-msg alan-reply"><strong>Alan:</strong> Sorry, there was an error.</div>`;
            messages.scrollTop = messages.scrollHeight;
        }
    });

    function convertLinks(text) {
        const urlRegex = /((https?:\/\/)[^\s]+)/g;
        return text.replace(urlRegex, url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
    }

    function escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }
});
