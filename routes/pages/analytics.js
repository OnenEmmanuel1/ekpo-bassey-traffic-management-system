/**
 * Analytics Page Route
 * JunctionAI - Intelligent Traffic Control System
 */

const express = require('express');
const router = express.Router();
const engine = require('../../engine/itcsEngine');
const { requireAuth } = require('../../middleware/auth');

router.get('/analytics', requireAuth, (req, res) => {
    const liveState = engine.getLiveState();
    res.render('pages/analytics', {
        title: 'Traffic Analytics & Congestion Metrics | JunctionAI',
        activeNav: 'analytics',
        state: liveState
    });
});

module.exports = router;
