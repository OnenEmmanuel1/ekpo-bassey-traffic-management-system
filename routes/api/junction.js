/**
 * Junction Live Telemetry & Control API Routes
 * JunctionAI - Intelligent Traffic Control System
 */

const express = require('express');
const router = express.Router();
const engine = require('../../engine/itcsEngine');
const { requireAuth } = require('../../middleware/auth');

/**
 * GET /api/junction/live-state
 * High-frequency endpoint delivering real-time intersection telemetry.
 */
router.get('/live-state', requireAuth, (req, res) => {
    try {
        const state = engine.getLiveState();
        res.json({
            success: true,
            data: state
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/junction/emergency-override
 * Manually trigger emergency preemption for a specific lane.
 */
router.post('/emergency-override', requireAuth, async (req, res) => {
    try {
        const { laneId, priorityType, notes } = req.body;
        if (!laneId) {
            return res.status(400).json({ success: false, error: 'laneId is required' });
        }

        const adminName = req.session.admin ? req.session.admin.name : 'Traffic Administrator';
        const triggerLabel = `Manual Command: ${priorityType || 'Emergency Clearance'} by ${adminName}`;

        const result = await engine.triggerEmergencyPreemption(laneId, triggerLabel, notes);
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/junction/emergency-clear
 * Manually release active emergency preemption.
 */
router.post('/emergency-clear', requireAuth, async (req, res) => {
    try {
        await engine.clearEmergencyPreemption();
        res.json({
            success: true,
            message: 'Emergency preemption cleared. Normal adaptive cycle resuming.'
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/junction/pedestrian-request
 * Submit a pedestrian crossing request.
 */
router.post('/pedestrian-request', requireAuth, async (req, res) => {
    try {
        const { notes } = req.body;
        const result = engine.requestPedestrianCrossing(notes || 'Manual Crosswalk Request from Console');
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/junction/density-override
 * Set or clear simulated density manual override for testing scenarios.
 */
router.post('/density-override', requireAuth, (req, res) => {
    try {
        const { laneId, density } = req.body;
        if (!laneId) {
            return res.status(400).json({ success: false, error: 'laneId is required' });
        }

        const parsedDensity = (density === '' || density === null || density === undefined) ? null : parseInt(density, 10);
        const success = engine.setManualLaneDensity(laneId, parsedDensity);

        if (success) {
            res.json({
                success: true,
                message: parsedDensity !== null
                    ? `Lane ${laneId} simulated density manually set to ${parsedDensity}%`
                    : `Lane ${laneId} manual override cleared (resumed natural simulation)`
            });
        } else {
            res.status(404).json({ success: false, error: 'Lane not found' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
