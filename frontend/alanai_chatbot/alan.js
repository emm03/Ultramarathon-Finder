document.addEventListener("DOMContentLoaded", () => {
    const bubble = document.getElementById("alan-bubble");
    const windowBox = document.getElementById("alan-window");
    const form = document.getElementById("alan-form");
    const input = document.getElementById("alan-input");
    const messages = document.getElementById("alan-messages");

    bubble.addEventListener("click", () => {
        windowBox.classList.toggle("open");
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const userMessage = input.value.trim();
        if (!userMessage) return;

        messages.innerHTML += `<div><strong>You:</strong> ${userMessage}</div>`;
        input.value = "";

        try {
            const response = await fetch("https://ultramarathon-finder-backend.onrender.com/api/alan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userMessage }),
            });
            const data = await response.json();
            messages.innerHTML += `<div><strong>Alan:</strong> ${data.reply}</div>`;
            messages.scrollTop = messages.scrollHeight;
        } catch (error) {
            messages.innerHTML += `<div><strong>Alan:</strong> Sorry, there was an error.</div>`;
        }
    });
});

