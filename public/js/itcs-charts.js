/**
 * JunctionAI Traffic Analytics & Chart Engine (Kemetra Light Theme)
 * Renders density curves, hourly throughput, and wait time distributions
 */

document.addEventListener('DOMContentLoaded', async () => {
    const densityCanvas = document.getElementById('itcs-density-chart');
    const hourlyCanvas = document.getElementById('itcs-hourly-chart');

    if (!densityCanvas && !hourlyCanvas) return;

    try {
        const response = await fetch('/api/analytics/historical');
        const result = await response.json();

        if (result.success && result.data && window.Chart) {
            initDensityChart(densityCanvas, result.data);
            initHourlyChart(hourlyCanvas, result.data);
        }
    } catch (err) {
        console.warn('[Charts Init Warning]:', err.message);
    }
});

function initDensityChart(canvas, data) {
    if (!canvas) return;

    // Filter by 4 lanes
    const lane1 = data.filter(d => d.laneId === 1).slice(-12);
    const labels = (lane1.length > 0 ? lane1 : data.slice(-12)).map(d => d.time || '');

    new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels.length > 0 ? labels : ['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00'],
            datasets: [
                {
                    label: 'Approach Density (%)',
                    data: lane1.length > 0 ? lane1.map(d => d.density) : [32, 28, 24, 22, 45, 68, 85, 72],
                    borderColor: '#ea580c', // Kemetra Orange stroke
                    backgroundColor: '#ea580c',
                    borderWidth: 2,
                    tension: 0.2,
                    pointRadius: 2,
                    pointHoverRadius: 4
                },
                {
                    label: 'Junction Baseline Avg',
                    data: [35, 30, 25, 20, 38, 55, 62, 58],
                    borderColor: '#94a3b8',
                    borderDash: [4, 4],
                    borderWidth: 1.5,
                    tension: 0.2,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: '#f1f5f9' },
                    ticks: { color: '#94a3b8', font: { size: 9 } }
                },
                y: {
                    min: 0,
                    max: 100,
                    grid: { color: '#f1f5f9' },
                    ticks: { color: '#94a3b8', font: { size: 9 }, stepSize: 25 }
                }
            }
        }
    });
}

function initHourlyChart(canvas, data) {
    if (!canvas) return;

    new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: ['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00'],
            datasets: [
                {
                    label: 'Dynamic Green (Sec)',
                    data: [15, 12, 10, 10, 25, 42, 58, 48],
                    borderColor: '#2563eb', // Kemetra Blue stroke
                    backgroundColor: '#2563eb',
                    borderWidth: 2,
                    tension: 0.2,
                    pointRadius: 2,
                    pointHoverRadius: 4
                },
                {
                    label: 'Min Bound (10s)',
                    data: [10, 10, 10, 10, 10, 10, 10, 10],
                    borderColor: '#10b981',
                    borderDash: [3, 3],
                    borderWidth: 1.5,
                    tension: 0,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: '#f1f5f9' },
                    ticks: { color: '#94a3b8', font: { size: 9 } }
                },
                y: {
                    min: 0,
                    max: 65,
                    grid: { color: '#f1f5f9' },
                    ticks: { color: '#94a3b8', font: { size: 9 }, stepSize: 15 }
                }
            }
        }
    });
}
