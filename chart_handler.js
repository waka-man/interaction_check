async function loadInteractionData() {
    try {
        const response = await fetch('output.json');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        displayTable(data.interaction_counts, data.non_participants);
        drawCharts(data.interaction_counts, data.non_participants, data.participation_over_time);
    } catch (error) {
        console.error("Could not load interaction data:", error);
    }
}

function displayTable(interactionCounts, nonParticipants) {
    const tableContainer = document.getElementById('interaction-table');
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
    html += `</tbody>
    </table>`;
    
    tableContainer.innerHTML = html;

    // Display the list of non-participants
    const nonParticipantsList = document.getElementById('non-participants-list');
    let nonParticipantsHtml = '';
    for (let attendee of nonParticipants) {
        nonParticipantsHtml += `<li>${attendee}</li>`;
    }
    nonParticipantsList.innerHTML = nonParticipantsHtml;
}
function drawCharts(interactionCounts, nonParticipants, participationOverTime) {
    // Bar Chart for Interaction Counts
    const interactionChartCtx = document.getElementById('interactionChart').getContext('2d');
    new Chart(interactionChartCtx, {
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

    // Pie Chart for Participation
    const participationChartCtx = document.getElementById('participationChart').getContext('2d');
    const totalAttendees = Object.keys(interactionCounts).length;
    const nonParticipantsCount = nonParticipants.length;
    const participantsCount = totalAttendees - nonParticipantsCount;

    new Chart(participationChartCtx, {
        type: 'pie',
        data: {
            labels: ['Participants', 'Non-Participants'],
            datasets: [{
                data: [participantsCount, nonParticipantsCount],
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

    // Corrected Horizontal Bar Chart for Interaction Distribution
    const horizontalInteractionChartCtx = document.getElementById('horizontalInteractionChart').getContext('2d');
    new Chart(horizontalInteractionChartCtx, {
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
            indexAxis: 'y',  // This makes it a horizontal bar chart
            scales: {
                x: {
                    beginAtZero: true
                }
            }
        }
    });

    const participationOverTimeChartCtx = document.getElementById('participationOverTimeChart').getContext('2d');

        const timeLabels = Object.keys(participationOverTime);
        const participationCounts = Object.values(participationOverTime);

        new Chart(participationOverTimeChartCtx, {
            type: 'line',
            data: {
                labels: timeLabels,
                datasets: [{
                    label: 'Number of Participants',
                    data: participationCounts,
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

document.addEventListener("DOMContentLoaded", loadInteractionData);