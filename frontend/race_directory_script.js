document.addEventListener("DOMContentLoaded", () => {
    const raceList = document.getElementById("race-list");
    const searchBar = document.getElementById("search-bar");
    const distanceCheckboxes = document.querySelectorAll(".distance-range");
    const durationCheckboxes = document.querySelectorAll(".duration-range");
    const monthFilter = document.getElementById("month-filter");
    const regionFilter = document.getElementById("region-filter");
    const resetButton = document.getElementById("reset-filters");
    const paginationControls = document.getElementById("pagination-controls");
    const racesPerPageSelect = document.getElementById("races-per-page");
  
    let races = [];
    let currentPage = 1;
    let racesPerPage = parseInt(racesPerPageSelect?.value || 20);
  
    const countryToContinent = {
      "USA": "North America", "CAN": "North America", "MEX": "North America",
      "BRA": "South America", "ARG": "South America", "CHL": "South America", "PER": "South America", "BOL": "South America", "COL": "South America",
      "FRA": "Europe", "GER": "Europe", "ITA": "Europe", "GBR": "Europe",
      "AUS": "Oceania", "NZL": "Oceania",
      "JPN": "Asia", "KOR": "Asia", "HKG": "Asia", "IND": "Asia", "MAS": "Asia", "VIE": "Asia", "TPE": "Asia", "PAK": "Asia", "THA": "Asia", "NEP": "Asia", "CHN": "Asia",
      "ZAF": "Africa", "KEN": "Africa"
    };
  
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
        if (!columns || columns.length < 4) return null;
  
        let [name, date, location, distance] = columns;
  
        name = name?.trim().replace(/^"|"$/g, "") || "N/A";
        date = date?.trim().replace(/^"|"$/g, "") || "N/A";
        location = location?.trim().replace(/^"|"$/g, "") || "N/A";
        distance = distance?.trim().replace(/^"|"$/g, "").toLowerCase() || "N/A";
  
        const continent = getContinent(location);
        const month = getMonth(date);
        const durationGroup = getDuration(distance);
  
        if ([name, date, location, distance].includes("N/A")) return null;
  
        return { name, date, location, distance, continent, month, durationGroup };
      }).filter(r => r !== null);
    }
  
    function getContinent(location) {
      const match = location.match(/\((\w{3})\)/);
      return match ? (countryToContinent[match[1]] || "Unknown") : "Unknown";
    }
  
    function getMonth(date) {
      const monthAbbr = date.match(/([A-Za-z]{3})/);
      const monthMap = {
        Jan: "January", Feb: "February", Mar: "March", Apr: "April", May: "May", Jun: "June",
        Jul: "July", Aug: "August", Sep: "September", Oct: "October", Nov: "November", Dec: "December"
      };
      return monthAbbr ? monthMap[monthAbbr[1]] || "Unknown" : "Unknown";
    }
  
    function getDuration(distance) {
      const hours = distance.match(/(\d{1,3})h/gi);
      if (!hours) return null;
  
      const max = Math.max(...hours.map(h => parseInt(h)));
      if (max < 7) return "<7";
      if (max <= 12) return "7-12";
      if (max <= 24) return "13-24";
      if (max <= 72) return "25-72";
      return ">73";
    }
  
    function convertToMiles(value) {
      if (value.endsWith("mi")) return parseFloat(value);
      if (value.endsWith("km")) return parseFloat(value) * 0.621371;
      return null;
    }
  
    function isDistanceInRange(value, min, max) {
      const miles = convertToMiles(value);
      return miles !== null && miles >= min && miles <= max;
    }
  
    function matchesDistanceFilter(distances, selectedRanges) {
      if (selectedRanges.length === 0) return true;
  
      const ranges = {
        "26-40": [26, 40],
        "41-60": [41, 60],
        "61-90": [61, 90],
        "91-110": [91, 110],
        "110+": [110, Infinity]
      };
  
      return distances.split(/\s+/).some(dist =>
        selectedRanges.some(range => {
          const [min, max] = ranges[range] || [0, Infinity];
          return isDistanceInRange(dist, min, max);
        })
      );
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
  
        const distancePills = race.distance.split(/\s+/).map(dist =>
          `<span class="distance-pill">${dist}</span>`
        ).join(" ");
  
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
      const selectedDistances = Array.from(distanceCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
      const selectedDurations = Array.from(durationCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
      const selectedMonth = monthFilter.value;
      const selectedRegion = regionFilter.value;
  
      const filtered = races.filter(race => {
        const matchSearch = race.name.toLowerCase().includes(searchText) || race.location.toLowerCase().includes(searchText);
        const matchDistance = matchesDistanceFilter(race.distance, selectedDistances);
        const matchDuration = selectedDurations.length === 0 || selectedDurations.includes(race.durationGroup);
        const matchMonth = selectedMonth === "" || race.month === selectedMonth;
        const matchRegion = selectedRegion === "" || race.continent === selectedRegion;
  
        return matchSearch && matchDistance && matchDuration && matchMonth && matchRegion;
      });
  
      displayRaces(filtered);
      updatePaginationControls(filtered.length);
    }
  
    function resetFilters() {
      searchBar.value = "";
      distanceCheckboxes.forEach(cb => cb.checked = false);
      durationCheckboxes.forEach(cb => cb.checked = false);
      monthFilter.value = "";
      regionFilter.value = "";
      currentPage = 1;
      filterRaces();
    }
  
    function updatePaginationControls(totalRaces) {
      paginationControls.innerHTML = "";
      const totalPages = Math.ceil(totalRaces / racesPerPage);
      const maxDisplayedPages = 5;
  
      if (totalPages <= maxDisplayedPages) {
        for (let i = 1; i <= totalPages; i++) createPageButton(i, currentPage === i);
      } else {
        createPageButton(1, currentPage === 1);
        if (currentPage > 3) paginationControls.appendChild(createEllipsis());
        for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
          createPageButton(i, currentPage === i);
        }
        if (currentPage < totalPages - 2) paginationControls.appendChild(createEllipsis());
        createPageButton(totalPages, currentPage === totalPages);
      }
    }
  
    function createPageButton(pageNumber, isActive) {
      const btn = document.createElement("button");
      btn.innerText = pageNumber;
      btn.classList.add("page-button");
      if (isActive) btn.classList.add("active");
      btn.addEventListener("click", () => {
        currentPage = pageNumber;
        filterRaces();
        updatePaginationControls(races.length);
      });
      paginationControls.appendChild(btn);
    }
  
    function createEllipsis() {
      const span = document.createElement("span");
      span.innerText = "...";
      span.classList.add("dots");
      return span;
    }
  
    searchBar.addEventListener("input", filterRaces);
    distanceCheckboxes.forEach(cb => cb.addEventListener("change", filterRaces));
    durationCheckboxes.forEach(cb => cb.addEventListener("change", filterRaces));
    monthFilter.addEventListener("change", filterRaces);
    regionFilter.addEventListener("change", filterRaces);
    resetButton.addEventListener("click", resetFilters);
  
    // ✅ races-per-page dropdown listener
    racesPerPageSelect.addEventListener("change", (e) => {
      racesPerPage = parseInt(e.target.value);
      currentPage = 1;
      filterRaces();
    });
  
    fetchRaces();
  });
  