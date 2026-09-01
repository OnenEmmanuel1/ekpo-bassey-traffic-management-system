/**
 * Reports & Data Export API Routes
 * JunctionAI - Intelligent Traffic Control System
 */

const express = require('express');
const router = express.Router();
const { query } = require('../../config/db');
const { requireAuth } = require('../../middleware/auth');

/**
 * GET /api/reports/traffic-volume
 * Paginated sensor readings filterable by lane.
 */
router.get('/traffic-volume', requireAuth, async (req, res) => {
    try {
        const laneId = req.query.laneId ? parseInt(req.query.laneId, 10) : null;
        const limit = Math.min(200, parseInt(req.query.limit || 50, 10));

        let sql = `
            SELECT sr.id, sr.lane_id, l.name AS lane_name, l.code AS lane_code,
                   sr.vehicle_density, sr.emergency_vehicle_flag, sr.pedestrian_waiting_flag,
                   sr.is_simulated, sr.recorded_at
            FROM sensor_readings sr
            LEFT JOIN lanes l ON sr.lane_id = l.id
        `;
        const params = [];

        if (laneId) {
            sql += ' WHERE sr.lane_id = ?';
            params.push(laneId);
        }

        sql += ' ORDER BY sr.recorded_at DESC LIMIT ?';
        params.push(limit);

        const [rows] = await query(sql, params);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/reports/preemption-logs
 * Historical emergency vehicle priority activations.
 */
router.get('/preemption-logs', requireAuth, async (req, res) => {
    try {
        const [rows] = await query(
            `SELECT p.id, p.lane_id, l.name AS lane_name, p.triggered_by, p.status,
                    p.triggered_at, p.ended_at, p.duration_seconds, p.notes
             FROM preemption_events p
             LEFT JOIN lanes l ON p.lane_id = l.id
             ORDER BY p.triggered_at DESC
             LIMIT 100`
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/reports/pedestrian-logs
 * Historical pedestrian crossing activations.
 */
router.get('/pedestrian-logs', requireAuth, async (req, res) => {
    try {
        const [rows] = await query(
            `SELECT id, requested_at, phase_started_at, phase_ended_at, duration_seconds, notes
             FROM pedestrian_events
             ORDER BY requested_at DESC
             LIMIT 100`
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/reports/export/csv
 * Generates and streams standard CSV files for audit reporting.
 */
router.get('/export/csv', requireAuth, async (req, res) => {
    try {
        const type = req.query.type || 'traffic';
        let csvContent = '';
        let filename = `JunctionAI_${type}_report_${Date.now()}.csv`;

        if (type === 'traffic') {
            const [rows] = await query(
                `SELECT sr.id, l.name AS lane_name, l.code AS lane_code,
                        sr.vehicle_density, sr.emergency_vehicle_flag, sr.pedestrian_waiting_flag,
                        sr.is_simulated, sr.recorded_at
                 FROM sensor_readings sr
                 LEFT JOIN lanes l ON sr.lane_id = l.id
                 ORDER BY sr.recorded_at DESC LIMIT 500`
            );

            csvContent = 'Reading ID,Lane Name,Lane Code,Vehicle Density (%),Emergency Flag,Pedestrian Flag,Simulated Source,Recorded Timestamp\n';
            (rows || []).forEach(r => {
                const recorded = new Date(r.recorded_at).toISOString();
                csvContent += `"${r.id}","${r.lane_name || 'Lane'}","${r.lane_code || ''}",${r.vehicle_density},${r.emergency_vehicle_flag ? 'YES' : 'NO'},${r.pedestrian_waiting_flag ? 'YES' : 'NO'},${r.is_simulated ? 'SIMULATED' : 'LIVE'},"${recorded}"\n`;
            });
        } else if (type === 'preemption') {
            const [rows] = await query(
                `SELECT p.id, l.name AS lane_name, p.triggered_by, p.status,
                        p.triggered_at, p.duration_seconds, p.notes
                 FROM preemption_events p
                 LEFT JOIN lanes l ON p.lane_id = l.id
                 ORDER BY p.triggered_at DESC LIMIT 200`
            );

            csvContent = 'Event ID,Approach Lane,Trigger Source,Status,Triggered Time,Duration (Seconds),Operational Notes\n';
            (rows || []).forEach(r => {
                const triggered = new Date(r.triggered_at).toISOString();
                csvContent += `"${r.id}","${r.lane_name || 'All Lanes'}","${r.triggered_by}","${r.status}","${triggered}",${r.duration_seconds},"${(r.notes || '').replace(/"/g, '""')}"\n`;
            });
        } else if (type === 'pedestrian') {
            const [rows] = await query(
                `SELECT id, requested_at, duration_seconds, notes
                 FROM pedestrian_events
                 ORDER BY requested_at DESC LIMIT 200`
            );

            csvContent = 'Event ID,Requested Timestamp,Hold Duration (Seconds),Notes\n';
            (rows || []).forEach(r => {
                const reqTime = new Date(r.requested_at).toISOString();
                csvContent += `"${r.id}","${reqTime}",${r.duration_seconds},"${(r.notes || '').replace(/"/g, '""')}"\n`;
            });
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(csvContent);
    } catch (err) {
        res.status(500).send(`Error generating CSV: ${err.message}`);
    }
});

module.exports = router;
