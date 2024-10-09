document.addEventListener("DOMContentLoaded", () => {
    loadInteractionData();
});

async function loadInteractionData() {
    try {
        const response = await fetch('output.json');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();

        if (!data) {
            throw new Error("No data found in output.json");
        }

        renderNavLinks(data);
        renderPageData(data);
    } catch (error) {
        console.error("Could not load interaction data:", error);
    }
}

// Renders navigation links based on JSON data
function renderNavLinks(data) {
    const navLinks = document.getElementById("nav-links");
    if (!navLinks) {
        console.error("Navigation container not found");
        return;
    }

    const links = [];

    // Link for aggregate data
    links.push(`<a href="?page=aggregate">Aggregate Data</a>`);

    // Links for each date
    if (data.by_date) {
        for (const date in data.by_date) {
            links.push(`<a href="?page=${encodeURIComponent(date)}">${date}</a>`);
        }
    }

    // Link for special students
    links.push(`<a href="?page=special_students">Special Students</a>`);

    navLinks.innerHTML = links.join(" | ");
}

// Renders the data for the current page
function renderPageData(data) {
    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get("page") || "aggregate";

    let interactionCounts, participationOverTime, nonParticipants, totalParticipants, totalNonParticipants;

    if (page === "aggregate") {
        document.getElementById("page-title").innerText = "Aggregate Data";
        interactionCounts = data.aggregate ? data.aggregate.interaction_counts : {};
        participationOverTime = data.aggregate ? data.aggregate.participation_over_time : {};
        nonParticipants = data.aggregate ? data.aggregate.non_participants : [];
        totalParticipants = data.aggregate ? data.aggregate.total_participants : 0;
        totalNonParticipants = data.aggregate ? data.aggregate.total_non_participants : 0;
    } else if (data.by_date && data.by_date[page]) {
        document.getElementById("page-title").innerText = `Data for ${page}`;
        interactionCounts = data.by_date[page].interaction_counts || {};
        participationOverTime = data.by_date[page].participation_over_time || {};
        nonParticipants = data.by_date[page].non_participants || [];
        totalParticipants = data.by_date[page].total_participants || 0;
        totalNonParticipants = data.by_date[page].total_non_participants || 0;
    } else if (page === "special_students") {
        document.getElementById("page-title").innerText = "Special Students Data";
        displaySpecialStudentsTable(data.special_students);
        drawSpecialStudentsCharts(data.special_students);
        return;
    } else {
        document.getElementById("page-title").innerText = "Page Not Found";
        return;
    }

    console.log("Total Participants:", totalParticipants);
    console.log("Total Non-Participants:", totalNonParticipants);

    displayInteractionTable(interactionCounts, nonParticipants);
    drawCharts(interactionCounts, nonParticipants, participationOverTime, totalParticipants, totalNonParticipants);
}

// Renders the interaction table and non-participants list
function displayInteractionTable(interactionCounts, nonParticipants) {
    const tableContainer = document.getElementById('interaction-table');
    if (!tableContainer) {
        console.error("Interaction table container not found");
        return;
    }

    let html = `<table>
        <thead>
            <tr>
                <th>Attendee</th>
                <th>Interaction Count</th>
            </tr>
        </thead>
        <tbody>`;

    // Convert interactionCounts object to an array and sort it by interaction count in descending order
    const sortedInteractions = Object.entries(interactionCounts)
        .filter(([attendee, count]) => count > 0) // Only include attendees with more than 0 interactions
        .sort((a, b) => b[1] - a[1]); // Sort by interaction count in descending order

    // Generate table rows for sorted interactions
    for (let [attendee, count] of sortedInteractions) {
        html += `<tr>
            <td>${attendee}</td>
            <td>${count}</td>
        </tr>`;
    }
    html += `</tbody></table>`;

    tableContainer.innerHTML = html;

    // Display the list of non-participants
    const nonParticipantsList = document.getElementById('nonParticipantsList');
    if (!nonParticipantsList) {
        console.error("Non-participants list container not found");
        return;
    }

    let nonParticipantsHtml = '';
    for (let attendee of nonParticipants) {
        nonParticipantsHtml += `<li>${attendee}</li>`;
    }
    nonParticipantsList.innerHTML = nonParticipantsHtml;
}

// Displays a table of special students and their participation
function displaySpecialStudentsTable(specialStudents) {
    const tableContainer = document.getElementById('interaction-table');
    if (!tableContainer) {
        console.error("Interaction table container not found");
        return;
    }

    let html = `<table>
        <thead>
            <tr>
                <th>Special Student</th>
                <th>Sessions Attended</th>
                <th>Total Interactions</th>
            </tr>
        </thead>
        <tbody>`;

    for (let [student, sessions] of Object.entries(specialStudents)) {
        const totalInteractions = Object.values(sessions).reduce((acc, val) => acc + val, 0);
        html += `<tr>
            <td>${student}</td>
            <td>${Object.keys(sessions).length}</td>
            <td>${totalInteractions}</td>
        </tr>`;
    }

    html += `</tbody></table>`;

    tableContainer.innerHTML = html;
}

// Draws the charts for interaction counts, participation, and over time
function drawCharts(interactionCounts, nonParticipants, participationOverTime, totalParticipants, totalNonParticipants) {
    // Safely destroy existing charts if they exist
    if (window.interactionChart && typeof window.interactionChart.destroy === "function") {
        window.interactionChart.destroy();
    }
    if (window.participationChart && typeof window.participationChart.destroy === "function") {
        window.participationChart.destroy();
    }
    if (window.horizontalInteractionChart && typeof window.horizontalInteractionChart.destroy === "function") {
        window.horizontalInteractionChart.destroy();
    }
    if (window.participationOverTimeChart && typeof window.participationOverTimeChart.destroy === "function") {
        window.participationOverTimeChart.destroy();
    }

    // Bar Chart for Interaction Counts
    const interactionChartCtx = document.getElementById('interactionChart')?.getContext('2d');
    if (interactionChartCtx) {
        window.interactionChart = new Chart(interactionChartCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(interactionCounts),
                datasets: [{
                    label: 'Number of Interactions',
                    data: Object.values(interactionCounts),
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Pie Chart for Participation
    const participationChartCtx = document.getElementById('participationChart')?.getContext('2d');
    if (participationChartCtx) {
        window.participationChart = new Chart(participationChartCtx, {
            type: 'pie',
            data: {
                labels: ['Participants', 'Non-Participants'],
                datasets: [{
                    data: [totalParticipants, totalNonParticipants],
                    backgroundColor: [
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(255, 99, 132, 0.6)'
                    ],
                    borderColor: [
                        'rgba(75, 192, 192, 1)',
                        'rgba(255, 99, 132, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true
            }
        });
    } else {
        console.error("Pie chart context not found.");
    }

    // Horizontal Bar Chart for Interaction Counts
    const horizontalInteractionChartCtx = document.getElementById('horizontalInteractionChart')?.getContext('2d');
    if (horizontalInteractionChartCtx) {
        window.horizontalInteractionChart = new Chart(horizontalInteractionChartCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(interactionCounts),
                datasets: [{
                    label: 'Number of Interactions',
                    data: Object.values(interactionCounts),
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                indexAxis: 'y', // Makes it a horizontal bar chart
                scales: {
                    x: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Line Chart for Participation Over Time
    const participationOverTimeChartCtx = document.getElementById('participationOverTimeChart')?.getContext('2d');
    if (participationOverTimeChartCtx) {
        window.participationOverTimeChart = new Chart(participationOverTimeChartCtx, {
            type: 'line',
            data: {
                labels: Object.keys(participationOverTime),
                datasets: [{
                    label: 'Number of Participants',
                    data: Object.values(participationOverTime),
                    fill: false,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

// Draws charts specifically for special students
function drawSpecialStudentsCharts(specialStudents) {
    const specialStudentChartCtx = document.getElementById('specialStudentChart')?.getContext('2d');
    if (!specialStudentChartCtx) {
        console.error("Special students chart container not found");
        return;
    }

    const studentNames = Object.keys(specialStudents);
    const totalInteractions = studentNames.map(student => {
        return Object.values(specialStudents[student]).reduce((acc, val) => acc + val, 0);
    });

    window.specialStudentChart = new Chart(specialStudentChartCtx, {
        type: 'bar',
        data: {
            labels: studentNames,
            datasets: [{
                label: 'Total Interactions',
                data: totalInteractions,
                backgroundColor: 'rgba(153, 102, 255, 0.6)',
                borderColor: 'rgba(153, 102, 255, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}