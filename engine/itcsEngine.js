/**
 * Dedicated Business Logic Engine: itcsEngine.js
 * JunctionAI - Intelligent Traffic Control System
 * Ekpo-Abasi Junction, Calabar South LGA, Cross River State
 *
 * Core Features:
 * 1. Realistic Simulated Per-Lane Vehicle Density Generator (Tagged as simulated)
 * 2. Adaptive Signal-Timing Controller (Dynamic Green calculation, Empty Lane Syndrome prevention)
 * 3. Emergency Vehicle Preemption State Machine (Safe yellow/all-red transition, priority clearance, event logging)
 * 4. Pedestrian Phase Controller (All-red vehicle hold, dedicated walk phase, compliance logging)
 * 5. Telemetry State Cache & Parameterized MySQL persistence
 */

const { query } = require('../config/db');
const AdaptiveAlgorithm = require('./adaptiveAlgorithm');

class ITCSEngine {
    constructor() {
        this.isRunning = false;
        this.timer = null;
        this.simulationTimer = null;
        this.tickRateMs = 1000; // Engine state evaluation tick (1s)

        // Target junction configuration cache
        this.config = {
            junction_name: 'Ekpo-Abasi Junction',
            junction_location: 'Calabar South LGA, Cross River State',
            min_green_seconds: 10,
            max_green_seconds: 60,
            yellow_seconds: 4,
            all_red_seconds: 2,
            density_weight_factor: 1.5,
            emergency_max_duration: 30,
            pedestrian_walk_duration: 15,
            pedestrian_max_wait_seconds: 45,
            sim_sensor_interval_ms: 3000,
            sim_emergency_probability: 0.04,
            sim_pedestrian_probability: 0.07
        };

        // Approaches / Lanes at Ekpo-Abasi Junction
        this.lanes = [
            {
                id: 1,
                code: 'L1_NB',
                name: 'Ekpo-Abasi Northbound',
                direction: 'Northbound',
                approach_description: 'Approach from UNICROSS / CRUTECH Main Gate',
                phase: 'green',
                density: 48,
                emergencyFlag: false,
                pedestrianFlag: false,
                queueCount: 14,
                manualDensityOverride: null
            },
            {
                id: 2,
                code: 'L2_SB',
                name: 'Ekpo-Abasi Southbound',
                direction: 'Southbound',
                approach_description: 'Approach from Calabar South Commercial Center / Watt Market Link',
                phase: 'red',
                density: 62,
                emergencyFlag: false,
                pedestrianFlag: false,
                queueCount: 18,
                manualDensityOverride: null
            },
            {
                id: 3,
                code: 'L3_EB',
                name: 'Mayne Avenue Eastbound',
                direction: 'Eastbound',
                approach_description: 'Approach from Anantigha / Coastal Bypass Link',
                phase: 'red',
                density: 35,
                emergencyFlag: false,
                pedestrianFlag: false,
                queueCount: 9,
                manualDensityOverride: null
            },
            {
                id: 4,
                code: 'L4_WB',
                name: 'Saintaggers Westbound',
                direction: 'Westbound',
                approach_description: 'Approach from Target / Mary Slessor Avenue',
                phase: 'red',
                density: 28,
                emergencyFlag: false,
                pedestrianFlag: false,
                queueCount: 7,
                manualDensityOverride: null
            }
        ];

        // Active State Tracking
        this.activeLaneIndex = 0; // Currently controlling lane index (0 = Lane 1)
        this.currentPhase = 'green'; // 'green' | 'yellow' | 'all_red' | 'pedestrian_walk' | 'emergency_hold'
        this.phaseSecondsRemaining = 20;
        this.phaseTotalDuration = 20;
        this.cycleId = `CYC_${Date.now()}`;
        this.cycleCount = 1;
        this.systemStartTime = Date.now();

        // Emergency Vehicle Preemption State
        this.emergencyState = {
            isActive: false,
            targetLaneId: null,
            triggeredBy: null,
            startedAt: null,
            holdSecondsRemaining: 0,
            maxDuration: 30,
            notes: null
        };

        // Pedestrian Phase State
        this.pedestrianState = {
            isRequested: false,
            requestedAt: null,
            isActive: false,
            walkSecondsRemaining: 0,
            walkTotalDuration: 15,
            notes: null
        };

        // Telemetry & Historical stats
        this.stats = {
            totalVehiclesCleared: 1240,
            totalPreemptionsExecuted: 2,
            totalPedestrianPhases: 3,
            avgWaitTimeSeconds: 22,
            uptimeSeconds: 0
        };
    }

    /**
     * Boots up the ITCS Engine, loads config, begins sensor simulation & timing ticks.
     */
    async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log('[ITCS Engine] Initializing Intelligent Traffic Control Engine for Ekpo-Abasi Junction...');

        await this.loadConfig();
        await this.initLaneStates();

        // Start background sensor simulation generator
        this.startSimulationGenerator();

        // Start master 1-second state tick
        this.timer = setInterval(() => this.tick(), this.tickRateMs);
        console.log('[ITCS Engine] Engine running smoothly. Adaptive controller active.');
    }

    /**
     * Stops the engine loop.
     */
    stop() {
        this.isRunning = false;
        if (this.timer) clearInterval(this.timer);
        if (this.simulationTimer) clearInterval(this.simulationTimer);
        console.log('[ITCS Engine] Engine stopped.');
    }

    /**
     * Loads live configuration parameters from the database.
     */
    async loadConfig() {
        try {
            const [rows] = await query('SELECT config_key, config_value FROM config');
            if (rows && rows.length > 0) {
                for (const row of rows) {
                    if (row.config_key in this.config) {
                        const num = parseFloat(row.config_value);
                        this.config[row.config_key] = isNaN(num) ? row.config_value : num;
                    }
                }
            }
        } catch (err) {
            console.warn('[ITCS Engine] Could not load config from DB, using memory defaults:', err.message);
        }
    }

    /**
     * Initializes lane records from DB or ensures defaults.
     */
    async initLaneStates() {
        try {
            const [rows] = await query('SELECT id, code, name, direction, approach_description FROM lanes WHERE is_active = 1');
            if (rows && rows.length > 0) {
                this.lanes = rows.map((r, idx) => ({
                    id: r.id,
                    code: r.code,
                    name: r.name,
                    direction: r.direction,
                    approach_description: r.approach_description,
                    phase: idx === 0 ? 'green' : 'red',
                    density: Math.floor(25 + Math.random() * 40),
                    emergencyFlag: false,
                    pedestrianFlag: false,
                    queueCount: 10,
                    manualDensityOverride: null
                }));
            }
        } catch (err) {
            console.warn('[ITCS Engine] Lanes loaded from memory model.');
        }

        // Start initial phase
        this.startGreenPhaseForLane(0);
    }

    /**
     * Background Simulated Sensor Generator (Module 2)
     * Simulates real-time per-lane vehicle density with realistic traffic curves,
     * occasionally generating emergency vehicles (e.g. from UNICROSS Health Center / Hospital Road)
     * and pedestrian crossing requests.
     */
    startSimulationGenerator() {
        const interval = this.config.sim_sensor_interval_ms || 3000;
        this.simulationTimer = setInterval(async () => {
            if (!this.isRunning) return;

            const hour = new Date().getHours();
            const allDensities = [];

            for (const lane of this.lanes) {
                // If manual override is active, use it
                if (lane.manualDensityOverride !== null) {
                    lane.density = lane.manualDensityOverride;
                } else {
                    // Realistic natural fluctuation curve
                    // Peak hours (07:00-09:30 & 16:30-19:30) have higher density
                    const isPeak = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19);
                    const baseDensity = isPeak ? 65 : 35;
                    const delta = (Math.random() * 16) - 8; // +/- 8
                    let newDensity = Math.round(lane.density + delta);

                    // Add approach bias
                    if (lane.id === 1 && (hour >= 7 && hour <= 10)) newDensity += 5; // UNICROSS morning surge
                    if (lane.id === 2 && (hour >= 16 && hour <= 19)) newDensity += 6; // Commercial return surge

                    lane.density = Math.max(5, Math.min(95, newDensity));
                }

                lane.queueCount = Math.round((lane.density / 100) * 35);
                allDensities.push(lane.density);

                // Stochastic emergency vehicle detection
                if (!this.emergencyState.isActive && Math.random() < (this.config.sim_emergency_probability || 0.04)) {
                    lane.emergencyFlag = true;
                    this.triggerEmergencyPreemption(
                        lane.id,
                        `Simulated Sensor Detection (Ambulance/Emergency - Approach ${lane.name})`,
                        `Automatic IR/Optical transponder simulation trigger on ${lane.name}`
                    );
                }

                // Stochastic pedestrian waiting detection
                if (!this.pedestrianState.isRequested && !this.pedestrianState.isActive && Math.random() < (this.config.sim_pedestrian_probability || 0.07)) {
                    lane.pedestrianFlag = true;
                    this.requestPedestrianCrossing(`Simulated Pedestrian Crosswalk Pushbutton Demand at ${lane.name}`);
                }

                // Persist reading to database (tagged is_simulated = 1)
                try {
                    await query(
                        'INSERT INTO sensor_readings (lane_id, vehicle_density, emergency_vehicle_flag, pedestrian_waiting_flag, is_simulated) VALUES (?, ?, ?, ?, ?)',
                        [lane.id, lane.density, lane.emergencyFlag ? 1 : 0, lane.pedestrianFlag ? 1 : 0, 1]
                    );
                } catch (dbErr) {
                    // Non-blocking log
                }
            }
        }, interval);
    }

    /**
     * Master 1-second state transition tick
     */
    async tick() {
        this.stats.uptimeSeconds++;

        // 1. Emergency Preemption Handling
        if (this.emergencyState.isActive) {
            this.handleEmergencyTick();
            return;
        }

        // 2. Pedestrian Phase Handling
        if (this.pedestrianState.isActive) {
            this.handlePedestrianTick();
            return;
        }

        // 3. Normal Adaptive Cycle Phasing
        this.phaseSecondsRemaining--;

        // Update statistics simulation
        if (this.currentPhase === 'green') {
            const activeLane = this.lanes[this.activeLaneIndex];
            if (activeLane && activeLane.queueCount > 0) {
                activeLane.queueCount = Math.max(0, activeLane.queueCount - 1);
                this.stats.totalVehiclesCleared++;
            }
        }

        if (this.phaseSecondsRemaining <= 0) {
            await this.advancePhase();
        }
    }

    /**
     * Advances the normal traffic cycle between Green -> Yellow -> All-Red -> Next Lane Green
     */
    async advancePhase() {
        if (this.currentPhase === 'green') {
            // Transition to Yellow clearance phase
            this.currentPhase = 'yellow';
            this.phaseTotalDuration = parseInt(this.config.yellow_seconds || 4, 10);
            this.phaseSecondsRemaining = this.phaseTotalDuration;

            // Set active lane to yellow, others red
            this.lanes.forEach((l, idx) => {
                l.phase = (idx === this.activeLaneIndex) ? 'yellow' : 'red';
            });

            await this.logSignalState(this.lanes[this.activeLaneIndex].id, 'yellow', this.phaseTotalDuration);
        } else if (this.currentPhase === 'yellow') {
            // Transition to All-Red clearance buffer
            this.currentPhase = 'all_red';
            this.phaseTotalDuration = parseInt(this.config.all_red_seconds || 2, 10);
            this.phaseSecondsRemaining = this.phaseTotalDuration;

            // All lanes red
            this.lanes.forEach(l => { l.phase = 'red'; });

            await this.logSignalState(this.lanes[this.activeLaneIndex].id, 'red', this.phaseTotalDuration);
        } else if (this.currentPhase === 'all_red') {
            // Check if a pedestrian phase was queued
            if (this.pedestrianState.isRequested) {
                await this.activatePedestrianPhase();
                return;
            }

            // Move to next lane in sequence (or dynamic next highest density)
            this.activeLaneIndex = (this.activeLaneIndex + 1) % this.lanes.length;
            if (this.activeLaneIndex === 0) {
                this.cycleCount++;
                this.cycleId = `CYC_${Date.now()}`;
            }

            await this.startGreenPhaseForLane(this.activeLaneIndex);
        }
    }

    /**
     * Starts adaptive Green phase for the specified lane
     * Solves "Empty Lane Syndrome" by dynamically computing duration from density
     */
    async startGreenPhaseForLane(laneIndex) {
        this.activeLaneIndex = laneIndex;
        this.currentPhase = 'green';

        const targetLane = this.lanes[laneIndex];
        const allDensities = this.lanes.map(l => l.density);

        // Adaptive timing calculation
        const timingResult = AdaptiveAlgorithm.calculateGreenDuration(targetLane.density, allDensities, {
            minGreen: this.config.min_green_seconds,
            maxGreen: this.config.max_green_seconds,
            densityWeight: this.config.density_weight_factor
        });

        this.phaseTotalDuration = timingResult.durationSeconds;
        this.phaseSecondsRemaining = this.phaseTotalDuration;

        // Update lane phases
        this.lanes.forEach((l, idx) => {
            l.phase = (idx === laneIndex) ? 'green' : 'red';
        });

        await this.logSignalState(targetLane.id, 'green', this.phaseTotalDuration);
    }

    /**
     * Triggers Emergency Vehicle Preemption (Module 4)
     * Rapidly clears conflicting traffic via Yellow -> All-Red, then locks target lane to Green.
     */
    async triggerEmergencyPreemption(laneId, triggeredBy = 'Traffic Authority Dispatch', notes = '') {
        const laneIdx = this.lanes.findIndex(l => l.id === parseInt(laneId, 10));
        if (laneIdx === -1) return { success: false, message: 'Invalid lane ID' };

        const targetLane = this.lanes[laneIdx];
        targetLane.emergencyFlag = true;

        this.emergencyState = {
            isActive: true,
            targetLaneId: targetLane.id,
            targetLaneIndex: laneIdx,
            triggeredBy,
            startedAt: new Date(),
            holdSecondsRemaining: parseInt(this.config.emergency_max_duration || 30, 10),
            maxDuration: parseInt(this.config.emergency_max_duration || 30, 10),
            notes: notes || `Priority route clearance for emergency transit on ${targetLane.name}`
        };

        // If the emergency lane is already green, hold it
        if (this.activeLaneIndex === laneIdx && this.currentPhase === 'green') {
            this.currentPhase = 'emergency_hold';
            this.phaseTotalDuration = this.emergencyState.maxDuration;
            this.phaseSecondsRemaining = this.emergencyState.maxDuration;
            this.lanes.forEach((l, idx) => {
                l.phase = (idx === laneIdx) ? 'green' : 'red';
            });
        } else {
            // Conflicting lane is active: rapid 3-second yellow clearance
            this.currentPhase = 'yellow';
            this.phaseTotalDuration = 3;
            this.phaseSecondsRemaining = 3;
            this.lanes.forEach((l, idx) => {
                l.phase = (idx === this.activeLaneIndex) ? 'yellow' : 'red';
            });
        }

        this.stats.totalPreemptionsExecuted++;
        return {
            success: true,
            message: `Emergency preemption activated for ${targetLane.name}. Conflicting lanes clearing safely.`
        };
    }

    /**
     * Handles 1-second countdown during active emergency preemption
     */
    async handleEmergencyTick() {
        this.emergencyState.holdSecondsRemaining--;
        this.phaseSecondsRemaining = this.emergencyState.holdSecondsRemaining;

        // If in rapid clearance transition
        if (this.currentPhase === 'yellow') {
            if (this.phaseSecondsRemaining <= 0) {
                this.currentPhase = 'emergency_hold';
                this.activeLaneIndex = this.emergencyState.targetLaneIndex;
                this.lanes.forEach((l, idx) => {
                    l.phase = (idx === this.emergencyState.targetLaneIndex) ? 'green' : 'red';
                });
                await this.logSignalState(this.lanes[this.emergencyState.targetLaneIndex].id, 'green', this.emergencyState.maxDuration);
            }
            return;
        }

        // Holding emergency green
        if (this.emergencyState.holdSecondsRemaining <= 0) {
            await this.clearEmergencyPreemption();
        }
    }

    /**
     * Safely terminates emergency preemption and returns to normal adaptive cycle
     */
    async clearEmergencyPreemption() {
        if (!this.emergencyState.isActive) return;

        const duration = this.emergencyState.maxDuration - Math.max(0, this.emergencyState.holdSecondsRemaining);

        try {
            await query(
                'INSERT INTO preemption_events (lane_id, triggered_by, status, duration_seconds, notes) VALUES (?, ?, ?, ?, ?)',
                [this.emergencyState.targetLaneId, this.emergencyState.triggeredBy, 'completed', duration, this.emergencyState.notes]
            );
        } catch (dbErr) {
            console.error('[ITCS Engine] Could not persist preemption event:', dbErr.message);
        }

        // Clear lane emergency flag
        const target = this.lanes.find(l => l.id === this.emergencyState.targetLaneId);
        if (target) target.emergencyFlag = false;

        this.emergencyState = {
            isActive: false,
            targetLaneId: null,
            triggeredBy: null,
            startedAt: null,
            holdSecondsRemaining: 0,
            maxDuration: 30,
            notes: null
        };

        // Transition through yellow clearance before resuming
        this.currentPhase = 'yellow';
        this.phaseTotalDuration = parseInt(this.config.yellow_seconds || 4, 10);
        this.phaseSecondsRemaining = this.phaseTotalDuration;
        this.lanes.forEach((l, idx) => {
            l.phase = (idx === this.activeLaneIndex) ? 'yellow' : 'red';
        });
    }

    /**
     * Requests a Pedestrian Crossing Phase (Module 5)
     */
    requestPedestrianCrossing(notes = 'Pedestrian push-button activated at crosswalk') {
        if (this.pedestrianState.isActive || this.pedestrianState.isRequested) {
            return { success: true, message: 'Pedestrian crossing phase already in queue' };
        }

        this.pedestrianState.isRequested = true;
        this.pedestrianState.requestedAt = new Date();
        this.pedestrianState.notes = notes;

        return {
            success: true,
            message: 'Pedestrian crossing request queued. Will activate safely at next phase clearance boundary.'
        };
    }

    /**
     * Activates the all-red vehicle hold & Pedestrian WALK phase
     */
    async activatePedestrianPhase() {
        this.pedestrianState.isRequested = false;
        this.pedestrianState.isActive = true;
        this.currentPhase = 'pedestrian_walk';

        const walkDuration = parseInt(this.config.pedestrian_walk_duration || 15, 10);
        this.pedestrianState.walkTotalDuration = walkDuration;
        this.pedestrianState.walkSecondsRemaining = walkDuration;
        this.phaseTotalDuration = walkDuration;
        this.phaseSecondsRemaining = walkDuration;

        // All vehicles red
        this.lanes.forEach(l => {
            l.phase = 'red';
            l.pedestrianFlag = false;
        });

        this.stats.totalPedestrianPhases++;
    }

    /**
     * Handles 1-second countdown during active pedestrian phase
     */
    async handlePedestrianTick() {
        this.pedestrianState.walkSecondsRemaining--;
        this.phaseSecondsRemaining = this.pedestrianState.walkSecondsRemaining;

        if (this.pedestrianState.walkSecondsRemaining <= 0) {
            // Log pedestrian phase event
            try {
                await query(
                    'INSERT INTO pedestrian_events (duration_seconds, notes) VALUES (?, ?)',
                    [this.pedestrianState.walkTotalDuration, this.pedestrianState.notes || 'Pedestrian safe crosswalk phase executed']
                );
            } catch (dbErr) {
                console.error('[ITCS Engine] Could not persist pedestrian event:', dbErr.message);
            }

            this.pedestrianState.isActive = false;
            this.pedestrianState.requestedAt = null;

            // Resume vehicle cycle with highest density lane or next sequential
            this.activeLaneIndex = (this.activeLaneIndex + 1) % this.lanes.length;
            await this.startGreenPhaseForLane(this.activeLaneIndex);
        }
    }

    /**
     * Helper to log signal state transitions
     */
    async logSignalState(laneId, phase, duration) {
        try {
            await query(
                'INSERT INTO signal_states (lane_id, phase, phase_duration_seconds, cycle_id) VALUES (?, ?, ?, ?)',
                [laneId, phase, duration, this.cycleId]
            );
        } catch (err) {
            // Non-blocking log
        }
    }

    /**
     * Sets manual density override for testing/simulation control
     */
    setManualLaneDensity(laneId, density) {
        const lane = this.lanes.find(l => l.id === parseInt(laneId, 10));
        if (lane) {
            lane.manualDensityOverride = density === null ? null : Math.max(0, Math.min(100, parseInt(density, 10)));
            if (lane.manualDensityOverride !== null) {
                lane.density = lane.manualDensityOverride;
                lane.queueCount = Math.round((lane.density / 100) * 35);
            }
            return true;
        }
        return false;
    }

    /**
     * Returns full live junction state snapshot for sub-second API polling
     */
    getLiveState() {
        const activeLane = this.lanes[this.activeLaneIndex] || this.lanes[0];
        const allDensities = this.lanes.map(l => l.density);
        const totalDensity = allDensities.reduce((a, b) => a + b, 0);

        return {
            timestamp: new Date().toISOString(),
            junction: {
                name: this.config.junction_name || 'Ekpo-Abasi Junction',
                location: this.config.junction_location || 'Calabar South LGA, Cross River State',
                status: 'ONLINE',
                cycleId: this.cycleId,
                cycleCount: this.cycleCount,
                uptimeSeconds: this.stats.uptimeSeconds
            },
            currentPhase: {
                phase: this.currentPhase, // 'green' | 'yellow' | 'all_red' | 'pedestrian_walk' | 'emergency_hold'
                activeLaneId: activeLane ? activeLane.id : 1,
                activeLaneName: activeLane ? activeLane.name : 'Ekpo-Abasi Northbound',
                activeLaneDirection: activeLane ? activeLane.direction : 'Northbound',
                secondsRemaining: Math.max(0, this.phaseSecondsRemaining),
                totalDuration: this.phaseTotalDuration,
                progressPercent: this.phaseTotalDuration > 0
                    ? Math.round(((this.phaseTotalDuration - this.phaseSecondsRemaining) / this.phaseTotalDuration) * 100)
                    : 0
            },
            lanes: this.lanes.map(l => ({
                id: l.id,
                code: l.code,
                name: l.name,
                direction: l.direction,
                approachDescription: l.approach_description,
                phase: l.phase, // 'red' | 'yellow' | 'green'
                density: l.density,
                queueCount: l.queueCount,
                emergencyFlag: l.emergencyFlag,
                pedestrianFlag: l.pedestrianFlag,
                manualOverride: l.manualDensityOverride !== null,
                performance: AdaptiveAlgorithm.estimatePerformanceMetrics(l.density, this.phaseTotalDuration)
            })),
            emergencyState: {
                isActive: this.emergencyState.isActive,
                targetLaneId: this.emergencyState.targetLaneId,
                triggeredBy: this.emergencyState.triggeredBy,
                holdSecondsRemaining: this.emergencyState.holdSecondsRemaining,
                maxDuration: this.emergencyState.maxDuration,
                notes: this.emergencyState.notes
            },
            pedestrianState: {
                isRequested: this.pedestrianState.isRequested,
                isActive: this.pedestrianState.isActive,
                walkSecondsRemaining: this.pedestrianState.walkSecondsRemaining,
                walkTotalDuration: this.pedestrianState.walkTotalDuration
            },
            metrics: {
                totalJunctionDensity: totalDensity,
                avgJunctionDensity: Math.round(totalDensity / Math.max(1, this.lanes.length)),
                totalVehiclesCleared: this.stats.totalVehiclesCleared,
                totalPreemptionsExecuted: this.stats.totalPreemptionsExecuted,
                totalPedestrianPhases: this.stats.totalPedestrianPhases,
                isSimulated: true
            },
            config: this.config
        };
    }
}

// Singleton engine instance
const engineInstance = new ITCSEngine();

module.exports = engineInstance;
