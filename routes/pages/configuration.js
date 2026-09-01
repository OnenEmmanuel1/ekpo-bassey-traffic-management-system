/**
 * Configuration Page Route
 * JunctionAI - Intelligent Traffic Control System
 */

const express = require('express');
const router = express.Router();
const { query } = require('../../config/db');
const engine = require('../../engine/itcsEngine');
const { requireAuth } = require('../../middleware/auth');

router.get('/configuration', requireAuth, async (req, res) => {
    try {
        const liveState = engine.getLiveState();
        const [configRows] = await query('SELECT * FROM config ORDER BY config_key ASC');

        res.render('pages/configuration', {
            title: 'System & Timing Parameters | JunctionAI',
            activeNav: 'configuration',
            state: liveState,
            configList: configRows || []
        });
    } catch (err) {
        res.status(500).render('pages/error', {
            title: 'Configuration Error',
            error: err,
            status: 500,
            currentPath: req.path
        });
    }
});

module.exports = router;
