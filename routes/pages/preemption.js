/**
 * Emergency Preemption Page Route
 * JunctionAI - Intelligent Traffic Control System
 */

const express = require('express');
const router = express.Router();
const { query } = require('../../config/db');
const engine = require('../../engine/itcsEngine');
const { requireAuth } = require('../../middleware/auth');

router.get('/preemption', requireAuth, async (req, res) => {
    try {
        const liveState = engine.getLiveState();
        const [recentEvents] = await query(
            `SELECT p.id, p.lane_id, l.name AS lane_name, l.direction, p.triggered_by, p.status,
                    p.triggered_at, p.ended_at, p.duration_seconds, p.notes
             FROM preemption_events p
             LEFT JOIN lanes l ON p.lane_id = l.id
             ORDER BY p.triggered_at DESC
             LIMIT 50`
        );

        res.render('pages/preemption', {
            title: 'Emergency Vehicle Preemption Dispatch | JunctionAI',
            activeNav: 'preemption',
            state: liveState,
            events: recentEvents || []
        });
    } catch (err) {
        res.status(500).render('pages/error', {
            title: 'Preemption Subsystem Error',
            error: err,
            status: 500,
            currentPath: req.path
        });
    }
});

module.exports = router;
