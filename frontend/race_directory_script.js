document.addEventListener("DOMContentLoaded", () => {
    const raceList = document.getElementById("race-list");
    const searchBar = document.getElementById("search-bar");
    const distanceFilter = document.getElementById("distance-filter");
    const resetButton = document.getElementById("reset-filters");
    const paginationControls = document.getElementById("pagination-controls");
    let races = [];
    let currentPage = 1;
    const racesPerPage = 20;

    const token = localStorage.getItem("token");
    const accountTab = document.getElementById("account-tab");

    if (token) {
        accountTab.innerHTML = `
            <a href="account.html">My Account</a>
            <a href="logout.html">Logout</a>
        `;
    } else {
        accountTab.innerHTML = `
            <a href="login.html">Login</a>
            <a href="register.html">Register</a>
        `;
    }

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
            const columns = row.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g);
            let [name, date, location, distance] = columns;

            name = name ? name.trim().replace(/^"|"$/g, "") : "N/A";
            date = date ? date.trim().replace(/^"|"$/g, "") : "N/A";
            location = location ? location.trim().replace(/^"|"$/g, "") : "N/A";
            distance = distance ? distance.trim().replace(/^"|"$/g, "").toLowerCase() : "N/A";

            if (name === "N/A" || date === "N/A" || location === "N/A" || distance === "N/A") {
                return null;
            }

            return { name, date, location, distance };
        }).filter(race => race !== null);
    }

    function convertToMiles(value) {
        if (value.endsWith("mi")) {
            return parseFloat(value);
        } else if (value.endsWith("km")) {
            return parseFloat(value) * 0.621371;
        }
        return null;
    }

    function isDistanceInRange(value, min, max) {
        const converted = convertToMiles(value);
        return converted !== null && converted >= min && converted <= max;
    }

    function matchesDistanceFilter(distanceString, selectedRange) {
        if (selectedRange === "") return true;

        const ranges = {
            "26-40": [26, 40],
            "41-60": [41, 60],
            "61-90": [61, 90],
            "91-110": [91, 110],
            "110+": [110, Infinity]
        };

        const [min, max] = ranges[selectedRange] || [0, Infinity];
        const distances = distanceString.split(/\s+/);

        return distances.some(dist => isDistanceInRange(dist, min, max));
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

            const distancePills = race.distance.split(/\s+/).map(dist => {
                return `<span class="distance-pill">${dist}</span>`;
            }).join(" ");

            raceElement.innerHTML = `
                <h3>${race.name}</h3>
                <p><strong>Date:</strong> ${race.date}</p>
                <p><strong>Location:</strong> ${race.location}</p>
                <p><strong>Distance:</strong> ${distancePills}</p>
            `;
            raceList.appendChild(raceElement);
        });
    }

    function filterRaces() {
        const searchText = searchBar.value.toLowerCase();
        const selectedDistance = distanceFilter.value;

        const filteredRaces = races.filter(race => {
            const matchesSearch = race.name.toLowerCase().includes(searchText) ||
                                  race.location.toLowerCase().includes(searchText);

            const matchesDistance = matchesDistanceFilter(race.distance, selectedDistance);

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
                paginationControls.appendChild(createEllipsis());
            }
            for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                createPageButton(i, currentPage === i);
            }
            if (currentPage < totalPages - 2) {
                paginationControls.appendChild(createEllipsis());
            }
            createPageButton(totalPages, currentPage === totalPages);
        }
    }

    function createPageButton(pageNumber, isActive) {
        const button = document.createElement("button");
        button.innerText = pageNumber;
        button.classList.add("page-button");
        if (isActive) button.classList.add("active");
        button.addEventListener("click", () => {
            currentPage = pageNumber;
            filterRaces();
            updatePaginationControls(races.length);
        });
        paginationControls.appendChild(button);
    }

    function createEllipsis() {
        const dots = document.createElement("span");
        dots.innerText = "...";
        dots.classList.add("dots");
        return dots;
    }

    searchBar.addEventListener("input", filterRaces);
    distanceFilter.addEventListener("change", filterRaces);
    resetButton.addEventListener("click", resetFilters);

    fetchRaces();
});
