/**
 * Pedestrian Phase Page Route
 * JunctionAI - Intelligent Traffic Control System
 */

const express = require('express');
const router = express.Router();
const { query } = require('../../config/db');
const engine = require('../../engine/itcsEngine');
const { requireAuth } = require('../../middleware/auth');

router.get('/pedestrian', requireAuth, async (req, res) => {
    try {
        const liveState = engine.getLiveState();
        const [recentEvents] = await query(
            `SELECT id, requested_at, phase_started_at, phase_ended_at, duration_seconds, notes
             FROM pedestrian_events
             ORDER BY requested_at DESC
             LIMIT 50`
        );

        res.render('pages/pedestrian', {
            title: 'Pedestrian Crossing Safety Console | JunctionAI',
            activeNav: 'pedestrian',
            state: liveState,
            events: recentEvents || []
        });
    } catch (err) {
        res.status(500).render('pages/error', {
            title: 'Pedestrian Subsystem Error',
            error: err,
            status: 500,
            currentPath: req.path
        });
    }
});

module.exports = router;
