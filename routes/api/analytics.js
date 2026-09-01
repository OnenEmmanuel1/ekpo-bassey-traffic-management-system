/**
 * Analytics API Routes
 * JunctionAI - Intelligent Traffic Control System
 */

const express = require('express');
const router = express.Router();
const { query } = require('../../config/db');
const engine = require('../../engine/itcsEngine');
const { requireAuth } = require('../../middleware/auth');

/**
 * GET /api/analytics/realtime-metrics
 * Aggregated live metrics, congestion index, estimated delay, total clears.
 */
router.get('/realtime-metrics', requireAuth, (req, res) => {
    try {
        const state = engine.getLiveState();
        res.json({
            success: true,
            data: {
                totalVehiclesCleared: state.metrics.totalVehiclesCleared,
                avgJunctionDensity: state.metrics.avgJunctionDensity,
                totalPreemptions: state.metrics.totalPreemptionsExecuted,
                totalPedestrianPhases: state.metrics.totalPedestrianPhases,
                uptimeSeconds: state.junction.uptimeSeconds,
                lanes: state.lanes
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/analytics/historical
 * Retrieves historical density time series per lane for charts.
 */
router.get('/historical', requireAuth, async (req, res) => {
    try {
        const [readings] = await query(
            `SELECT sr.id, sr.lane_id, l.name AS lane_name, l.code AS lane_code,
                    sr.vehicle_density, sr.emergency_vehicle_flag, sr.pedestrian_waiting_flag, sr.recorded_at
             FROM sensor_readings sr
             LEFT JOIN lanes l ON sr.lane_id = l.id
             ORDER BY sr.recorded_at DESC
             LIMIT 120`
        );

        // Group readings by timestamp / lane
        const formatted = (readings || []).reverse().map(r => ({
            id: r.id,
            laneId: r.lane_id,
            laneName: r.lane_name,
            laneCode: r.lane_code,
            density: r.vehicle_density,
            emergency: Boolean(r.emergency_vehicle_flag),
            pedestrian: Boolean(r.pedestrian_waiting_flag),
            time: new Date(r.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        }));

        res.json({
            success: true,
            data: formatted
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
