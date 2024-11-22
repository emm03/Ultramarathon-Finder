document.addEventListener("DOMContentLoaded", () => {
    // Carousel Functionality
    const slides = document.querySelectorAll(".carousel-item");
    if (slides.length) {
        let currentIndex = 0;
        const autoSlideInterval = 5000;

        function showSlide(index) {
            slides.forEach((slide) => slide.classList.remove("active"));
            currentIndex = (index + slides.length) % slides.length;
            slides[currentIndex].classList.add("active");
        }

        function nextSlide() {
            showSlide(currentIndex + 1);
        }

        function prevSlide() {
            showSlide(currentIndex - 1);
        }

        document.querySelector(".carousel-control-next")?.addEventListener("click", nextSlide);
        document.querySelector(".carousel-control-prev")?.addEventListener("click", prevSlide);

        let slideTimer = setInterval(nextSlide, autoSlideInterval);

        document.querySelector(".carousel")?.addEventListener("mouseover", () => clearInterval(slideTimer));
        document.querySelector(".carousel")?.addEventListener("mouseout", () => {
            slideTimer = setInterval(nextSlide, autoSlideInterval);
        });

        showSlide(currentIndex);
    }

    // Race Directory Functionality
    const raceList = document.getElementById("race-list");
    const searchBar = document.getElementById("search-bar");
    const distanceFilter = document.getElementById("distance-filter");
    const resetButton = document.getElementById("reset-filters");
    const paginationControls = document.getElementById("pagination-controls");
    let races = [];
    let currentPage = 1;
    const racesPerPage = 20;

    function fetchRaces() {
        fetch("duv_ultramarathons.csv")
            .then((response) => response.text())
            .then((data) => {
                races = parseCSV(data);
                filterRaces();
            })
            .catch((error) => console.error("Error fetching races:", error));
    }

    function parseCSV(data) {
        return data.split("\n").slice(1).map((row) => {
            const columns = row.split(",");
            const [name, date, distance, location] = columns.map((col) => col.trim());
            return { name, date, distance, location };
        });
    }

    function filterRaces() {
        const searchText = searchBar?.value.toLowerCase() || "";
        const selectedDistance = distanceFilter?.value.toLowerCase() || "";

        const filteredRaces = races.filter((race) => {
            const matchesSearch = race.name.toLowerCase().includes(searchText);
            const matchesDistance = selectedDistance === "" || race.distance.toLowerCase().includes(selectedDistance);
            return matchesSearch && matchesDistance;
        });

        displayRaces(filteredRaces);
    }

    function displayRaces(filteredRaces) {
        raceList.innerHTML = filteredRaces.slice((currentPage - 1) * racesPerPage, currentPage * racesPerPage)
            .map((race) => `
                <div class="race">
                    <h3>${race.name}</h3>
                    <p>${race.date} - ${race.distance} - ${race.location}</p>
                </div>
            `).join("");
    }

    if (searchBar && distanceFilter && resetButton) {
        searchBar.addEventListener("input", filterRaces);
        distanceFilter.addEventListener("change", filterRaces);
        resetButton.addEventListener("click", () => {
            searchBar.value = "";
            distanceFilter.value = "";
            filterRaces();
        });

        fetchRaces();
    }

    // Forum Functionality
    const commentForm = document.querySelector(".forum-form");
    const commentsSection = document.querySelector(".forum-posts");
    const forumName = document.querySelector("main")?.dataset?.forum;

    async function fetchComments() {
        try {
            const response = await fetch(`/api/forum/comments/${forumName}`);
            if (!response.ok) throw new Error("Failed to fetch comments");

            const comments = await response.json();
            commentsSection.innerHTML = comments.map((comment) => `
                <div class="post">
                    <h4>${comment.username || "Anonymous"}</h4>
                    <p>${comment.content}</p>
                    <small>${new Date(comment.timestamp).toLocaleString()}</small>
                </div>
            `).join("");
        } catch (error) {
            console.error("Error fetching comments:", error);
        }
    }

    async function postComment(content) {
        try {
            const response = await fetch("/api/forum/comments", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify({ content, forum: forumName }),
            });

            if (!response.ok) throw new Error("Failed to post comment");
            fetchComments();
        } catch (error) {
            console.error("Error posting comment:", error);
        }
    }

    if (commentForm && commentsSection) {
        commentForm.addEventListener("submit", (event) => {
            event.preventDefault();
            const content = commentForm.querySelector("textarea").value.trim();
            if (content) postComment(content);
        });

        fetchComments();
    }
});
