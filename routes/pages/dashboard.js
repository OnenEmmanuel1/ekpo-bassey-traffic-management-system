/**
 * Dashboard Page Route
 * JunctionAI - Intelligent Traffic Control System
 */

const express = require('express');
const router = express.Router();
const engine = require('../../engine/itcsEngine');
const { requireAuth } = require('../../middleware/auth');

/**
 * GET /
 * Root redirect to /dashboard
 */
router.get('/', (req, res) => {
    res.redirect('/dashboard');
});

/**
 * GET /dashboard
 * Live Intersection Control Room view
 */
router.get('/dashboard', requireAuth, (req, res) => {
    const liveState = engine.getLiveState();
    res.render('pages/dashboard', {
        title: 'Live Intersection Control Room | JunctionAI',
        activeNav: 'dashboard',
        state: liveState
    });
});

module.exports = router;
