document.addEventListener("DOMContentLoaded", () => {
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
            .then(response => response.text())
            .then(data => {
                races = parseCSV(data);
                filterRaces();
            })
            .catch(error => console.error("Error fetching the CSV file:", error));
    }

    function parseCSV(data) {
        const rows = data.split("\n").slice(1);
        return rows.map(row => {
            // Handle cases where columns are wrapped in quotes and contain commas
            const columns = row.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g);
            let [name, date, distance, location] = columns;

            // Removing the surrounding quotes, if any
            name = name ? name.trim().replace(/^"|"$/g, "") : "N/A";
            date = date ? date.trim().replace(/^"|"$/g, "") : "N/A";
            distance = distance ? distance.trim().replace(/^"|"$/g, "").toLowerCase() : "N/A";
            location = location ? location.trim().replace(/^"|"$/g, "") : "N/A";

            // Remove "N/A" entries
            if (name === "N/A" || date === "N/A" || distance === "N/A" || location === "N/A") {
                return null;
            }

            return { name, date, distance, location };
        }).filter(race => race !== null);
    }

    function displayRaces(filteredRaces) {
        raceList.innerHTML = "";
        const start = (currentPage - 1) * racesPerPage;
        const end = start + racesPerPage;
        const racesToShow = filteredRaces.slice(start, end);

        if (racesToShow.length === 0) {
            raceList.innerHTML = "<p>No races found. Try adjusting your filters.</p>";
            return;
        }

        racesToShow.forEach(race => {
            const raceElement = document.createElement("div");
            raceElement.classList.add("race-card");
            raceElement.innerHTML = `
                <h3>${race.name}</h3>
                <p><strong>Date:</strong> ${race.date}</p>
                <p><strong>Location:</strong> ${race.location}</p>
                <p><strong>Distance:</strong> ${race.distance}</p>
            `;
            raceList.appendChild(raceElement);
        });
    }

    function filterRaces() {
        const searchText = searchBar.value.toLowerCase();
        const selectedDistance = distanceFilter.value.toLowerCase();

        const filteredRaces = races.filter(race => {
            const matchesSearch = race.name.toLowerCase().includes(searchText) ||
                                  race.location.toLowerCase().includes(searchText);
            const matchesDistance = selectedDistance === "" ||
                race.distance.includes(selectedDistance) ||
                (selectedDistance === "100 miles" && race.distance.includes("100mi")) ||
                (selectedDistance === "50 miles" && race.distance.includes("50mi")) ||
                (selectedDistance === "150 miles" && race.distance.includes("150mi")) ||
                (selectedDistance === "200 miles" && race.distance.includes("200mi"));

            return matchesSearch && matchesDistance;
        });

        displayRaces(filteredRaces);
        updatePaginationControls(filteredRaces.length);
    }

    function resetFilters() {
        searchBar.value = "";
        distanceFilter.value = "";
        currentPage = 1;
        filterRaces();
    }

    function updatePaginationControls(totalRaces) {
        paginationControls.innerHTML = "";
        const totalPages = Math.ceil(totalRaces / racesPerPage);
        const maxDisplayedPages = 5;

        if (totalPages <= maxDisplayedPages) {
            for (let i = 1; i <= totalPages; i++) {
                createPageButton(i, currentPage === i);
            }
        } else {
            createPageButton(1, currentPage === 1);
            if (currentPage > 3) {
                const dots = document.createElement("span");
                dots.innerText = "...";
                dots.classList.add("dots");
                paginationControls.appendChild(dots);
            }
            for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                createPageButton(i, currentPage === i);
            }
            if (currentPage < totalPages - 2) {
                const dots = document.createElement("span");
                dots.innerText = "...";
                dots.classList.add("dots");
                paginationControls.appendChild(dots);
            }
            createPageButton(totalPages, currentPage === totalPages);
        }
    }

    function createPageButton(pageNumber, isActive) {
        const pageButton = document.createElement("button");
        pageButton.innerText = pageNumber;
        pageButton.classList.add("page-button");
        if (isActive) pageButton.classList.add("active");
        pageButton.addEventListener("click", () => {
            currentPage = pageNumber;
            filterRaces();
            updatePaginationControls(races.length);
        });
        paginationControls.appendChild(pageButton);
    }

    searchBar.addEventListener("input", filterRaces);
    distanceFilter.addEventListener("change", filterRaces);
    resetButton.addEventListener("click", resetFilters);

    fetchRaces();
});

