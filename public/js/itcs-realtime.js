/**
 * JunctionAI Real-Time Telemetry Client
 * Synchronizes live intersection state with the visualizer and dashboard widgets
 */

(function () {
    const POLL_INTERVAL_MS = 1000;
    let pollTimer = null;
    let isConnected = true;

    async function fetchLiveState() {
        try {
            const response = await fetch('/api/junction/live-state');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const payload = await response.json();

            if (payload.success && payload.data) {
                updateDashboard(payload.data);
                if (!isConnected) {
                    isConnected = true;
                    setConnectionStatus(true);
                }
            }
        } catch (err) {
            console.warn('[Telemetry Sync Warning]:', err.message);
            if (isConnected) {
                isConnected = false;
                setConnectionStatus(false);
            }
        }
    }

    function setConnectionStatus(online) {
        const badge = document.getElementById('itcs-connection-status');
        if (badge) {
            if (online) {
                badge.style.color = 'var(--itcs-color-primary)';
                badge.textContent = 'Online';
            } else {
                badge.style.color = 'var(--itcs-color-emergency)';
                badge.textContent = 'Retrying Sync';
            }
        }
    }

    function updateDashboard(state) {
        // 1. Update Center Countdown & Phase Hub
        const hubTimer = document.getElementById('itcs-hub-countdown');
        const hubPhase = document.getElementById('itcs-hub-phase');
        const activeLaneDisplay = document.getElementById('itcs-active-lane-name');
        const activeProgress = document.getElementById('itcs-phase-progress');

        if (hubTimer) hubTimer.textContent = `${state.currentPhase.secondsRemaining}s`;
        if (hubPhase) {
            let phaseLabel = state.currentPhase.phase.toUpperCase();
            if (state.currentPhase.phase === 'emergency_hold') phaseLabel = 'EMERGENCY HOLD';
            if (state.currentPhase.phase === 'pedestrian_walk') phaseLabel = 'PEDESTRIAN WALK';
            hubPhase.textContent = phaseLabel;
        }
        if (activeLaneDisplay) activeLaneDisplay.textContent = state.currentPhase.activeLaneName;
        if (activeProgress) activeProgress.style.width = `${state.currentPhase.progressPercent}%`;

        // 2. Update Intersection Map Container (Emergency strobe)
        const mapContainer = document.getElementById('itcs-intersection-map');
        if (mapContainer) {
            if (state.emergencyState.isActive) {
                mapContainer.classList.add('itcs-emergency-active-border');
            } else {
                mapContainer.classList.remove('itcs-emergency-active-border');
            }
        }

        // 3. Update Individual Lane Signals and Density Overlays
        state.lanes.forEach((lane, idx) => {
            const laneNum = idx + 1;

            // Signal Head Lights
            const redLight = document.getElementById(`itcs-signal-red-${laneNum}`);
            const yellowLight = document.getElementById(`itcs-signal-yellow-${laneNum}`);
            const greenLight = document.getElementById(`itcs-signal-green-${laneNum}`);

            if (redLight && yellowLight && greenLight) {
                redLight.classList.remove('active');
                yellowLight.classList.remove('active');
                greenLight.classList.remove('active');

                if (lane.phase === 'red') redLight.classList.add('active');
                else if (lane.phase === 'yellow') yellowLight.classList.add('active');
                else if (lane.phase === 'green') greenLight.classList.add('active');
            }

            // Corridor Status Pill
            const corridorPill = document.getElementById(`itcs-corridor-pill-${laneNum}`);
            if (corridorPill) {
                corridorPill.textContent = lane.phase.toUpperCase();
                corridorPill.className = 'itcs-status-pill ' +
                    (lane.phase === 'green' ? 'itcs-pill-green' : (lane.phase === 'yellow' ? 'itcs-pill-amber' : 'itcs-pill-red'));
            }

            // Density Text & Queue Count
            const densityVal = document.getElementById(`itcs-lane-density-${laneNum}`);
            const queueVal = document.getElementById(`itcs-lane-queue-${laneNum}`);
            const fillBar = document.getElementById(`itcs-lane-fill-${laneNum}`);

            if (densityVal) densityVal.textContent = `${lane.density}%`;
            if (queueVal) queueVal.textContent = `${lane.queueCount} veh`;
            if (fillBar) {
                fillBar.style.width = `${lane.density}%`;
                fillBar.className = 'itcs-progress-fill ' +
                    (lane.density >= 70 ? 'itcs-progress-fill-red' : (lane.density >= 40 ? 'itcs-progress-fill-yellow' : 'itcs-progress-fill-green'));
            }

            // Emergency Badge on Lane
            const emergBadge = document.getElementById(`itcs-lane-emerg-badge-${laneNum}`);
            if (emergBadge) {
                emergBadge.style.display = (lane.emergencyFlag || (state.emergencyState.isActive && state.emergencyState.targetLaneId === lane.id)) ? 'inline-flex' : 'none';
            }
        });

        // 4. Update Pedestrian Crosswalk Box
        const pedBox = document.getElementById('itcs-ped-signal-box');
        if (pedBox) {
            if (state.pedestrianState.isActive) {
                pedBox.className = 'itcs-ped-box itcs-ped-walk';
                pedBox.innerHTML = `<span>WALK</span> <span>${state.pedestrianState.walkSecondsRemaining}s</span>`;
            } else if (state.pedestrianState.isRequested) {
                pedBox.className = 'itcs-ped-box itcs-ped-dont-walk';
                pedBox.innerHTML = `<span>WAITING</span>`;
            } else {
                pedBox.className = 'itcs-ped-box itcs-ped-dont-walk';
                pedBox.innerHTML = `<span>DON'T WALK</span>`;
            }
        }

        // 5. Update Metrics Counters
        const clearedStat = document.getElementById('itcs-metric-cleared');
        const avgDensityStat = document.getElementById('itcs-metric-avg-density');
        const preemptStat = document.getElementById('itcs-metric-preempt-count');
        const uptimeStat = document.getElementById('itcs-metric-uptime');

        if (clearedStat) clearedStat.textContent = state.metrics.totalVehiclesCleared.toLocaleString();
        if (avgDensityStat) avgDensityStat.textContent = `${state.metrics.avgJunctionDensity}%`;
        if (preemptStat) preemptStat.textContent = state.metrics.totalPreemptionsExecuted;
        if (uptimeStat) {
            const mins = Math.floor(state.junction.uptimeSeconds / 60);
            const secs = state.junction.uptimeSeconds % 60;
            uptimeStat.textContent = `${mins}m ${secs}s`;
        }

        // 6. Update Banner Notification for Emergency State
        const emergBanner = document.getElementById('itcs-active-emergency-banner');
        if (emergBanner) {
            if (state.emergencyState.isActive) {
                emergBanner.style.display = 'flex';
                const bannerDesc = document.getElementById('itcs-emerg-banner-text');
                if (bannerDesc) bannerDesc.textContent = `Active Emergency Priority: ${state.emergencyState.triggeredBy || 'Preemption hold active'} (${state.emergencyState.holdSecondsRemaining}s remaining)`;
            } else {
                emergBanner.style.display = 'none';
            }
        }
    }

    // Initialize clock ticker
    function startClock() {
        const clockEl = document.getElementById('itcs-live-clock');
        if (!clockEl) return;
        setInterval(() => {
            const now = new Date();
            clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }, 1000);
    }

    // Auto-start polling on page load
    document.addEventListener('DOMContentLoaded', () => {
        startClock();
        fetchLiveState();
        pollTimer = setInterval(fetchLiveState, POLL_INTERVAL_MS);
    });
})();
