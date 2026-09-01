/**
 * Configuration API Routes
 * JunctionAI - Intelligent Traffic Control System
 */

const express = require('express');
const router = express.Router();
const { query } = require('../../config/db');
const engine = require('../../engine/itcsEngine');
const { requireAuth } = require('../../middleware/auth');

/**
 * GET /api/config
 * Retrieves all current system configuration parameters.
 */
router.get('/', requireAuth, async (req, res) => {
    try {
        const [rows] = await query('SELECT id, config_key, config_value, description, updated_at FROM config');
        res.json({
            success: true,
            data: rows
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * PUT /api/config
 * Updates one or more configuration values with parameterized queries.
 */
router.put('/', requireAuth, async (req, res) => {
    try {
        const updates = req.body; // e.g. { min_green_seconds: '12', max_green_seconds: '65' }
        if (!updates || typeof updates !== 'object') {
            return res.status(400).json({ success: false, error: 'Invalid config payload' });
        }

        for (const [key, value] of Object.entries(updates)) {
            await query(
                'UPDATE config SET config_value = ? WHERE config_key = ?',
                [String(value), key]
            );
        }

        // Reload updated configuration into running engine
        await engine.loadConfig();

        res.json({
            success: true,
            message: 'Configuration updated successfully and applied to running engine.',
            updatedConfig: engine.config
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
