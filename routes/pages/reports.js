/**
 * Reports Page Route
 * JunctionAI - Intelligent Traffic Control System
 */

const express = require('express');
const router = express.Router();
const { query } = require('../../config/db');
const engine = require('../../engine/itcsEngine');
const { requireAuth } = require('../../middleware/auth');

router.get('/reports', requireAuth, async (req, res) => {
    try {
        const liveState = engine.getLiveState();

        const [lanes] = await query('SELECT id, name, code, direction FROM lanes WHERE is_active = 1');
        const [recentReadings] = await query(
            `SELECT sr.id, sr.lane_id, l.name AS lane_name, l.code AS lane_code,
                    sr.vehicle_density, sr.emergency_vehicle_flag, sr.pedestrian_waiting_flag,
                    sr.is_simulated, sr.recorded_at
             FROM sensor_readings sr
             LEFT JOIN lanes l ON sr.lane_id = l.id
             ORDER BY sr.recorded_at DESC
             LIMIT 30`
        );

        res.render('pages/reports', {
            title: 'Audit Logs & Reporting Center | JunctionAI',
            activeNav: 'reports',
            state: liveState,
            lanes: lanes || [],
            readings: recentReadings || []
        });
    } catch (err) {
        res.status(500).render('pages/error', {
            title: 'Reports Error',
            error: err,
            status: 500,
            currentPath: req.path
        });
    }
});

module.exports = router;
