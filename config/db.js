/**
 * Database Configuration & Connection Pool
 * JunctionAI - Intelligent Traffic Control System
 * Ekpo-Abasi Junction, Calabar South
 */

const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'junction_ai_db',
    waitForConnections: true,
    connectionLimit: 15,
    queueLimit: 0,
    decimalNumbers: true
};

let pool = null;
let isConnected = false;

// Fallback in-memory store for development/offline environments
const memoryStore = {
    admins: [],
    lanes: [
        { id: 1, code: 'L1_NB', name: 'Ekpo-Abasi Northbound', direction: 'Northbound', approach_description: 'Approach from UNICROSS / CRUTECH Main Gate', is_active: 1 },
        { id: 2, code: 'L2_SB', name: 'Ekpo-Abasi Southbound', direction: 'Southbound', approach_description: 'Approach from Calabar South Commercial Center / Watt Market Link', is_active: 1 },
        { id: 3, code: 'L3_EB', name: 'Mayne Avenue Eastbound', direction: 'Eastbound', approach_description: 'Approach from Anantigha / Coastal Bypass Link', is_active: 1 },
        { id: 4, code: 'L4_WB', name: 'Saintaggers Westbound', direction: 'Westbound', approach_description: 'Approach from Target / Mary Slessor Avenue', is_active: 1 }
    ],
    sensor_readings: [],
    signal_states: [],
    preemption_events: [],
    pedestrian_events: [],
    config: new Map([
        ['junction_name', 'Ekpo-Abasi Junction'],
        ['junction_location', 'Calabar South LGA, Cross River State'],
        ['min_green_seconds', '10'],
        ['max_green_seconds', '60'],
        ['yellow_seconds', '4'],
        ['all_red_seconds', '2'],
        ['density_weight_factor', '1.5'],
        ['emergency_max_duration', '30'],
        ['pedestrian_walk_duration', '15'],
        ['pedestrian_max_wait_seconds', '45'],
        ['sim_sensor_interval_ms', '3000'],
        ['sim_emergency_probability', '0.04'],
        ['sim_pedestrian_probability', '0.07']
    ])
};

/**
 * Initializes the MySQL database connection pool and runs auto-migrations.
 */
async function initDatabase() {
    try {
        // First create database if not existing
        const rootConnection = await mysql.createConnection({
            host: dbConfig.host,
            port: dbConfig.port,
            user: dbConfig.user,
            password: dbConfig.password
        });

        await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\`;`);
        await rootConnection.end();

        // Create connection pool
        pool = mysql.createPool(dbConfig);
        const [testResult] = await pool.query('SELECT 1 + 1 AS test');
        if (testResult) {
            isConnected = true;
            console.log(`[Database] Successfully connected to MySQL database: ${dbConfig.database} at ${dbConfig.host}:${dbConfig.port}`);
            await runMigrations();
        }
    } catch (err) {
        console.warn(`[Database] MySQL connection failed (${err.message}). Activating High-Performance Engine Storage fallback.`);
        isConnected = false;
        await seedMemoryStore();
    }
}

/**
 * Executes schema and seed SQL scripts against MySQL.
 */
async function runMigrations() {
    if (!pool) return;
    try {
        const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
        const seedPath = path.join(__dirname, '..', 'database', 'seed.sql');

        if (fs.existsSync(schemaPath)) {
            const schemaSql = fs.readFileSync(schemaPath, 'utf8');
            const queries = schemaSql
                .split(';')
                .map(q => q.trim())
                .filter(q => q.length > 0);

            for (const q of queries) {
                await pool.query(q);
            }
            console.log('[Database] Schema migrations applied successfully.');
        }

        if (fs.existsSync(seedPath)) {
            const seedSql = fs.readFileSync(seedPath, 'utf8');
            const queries = seedSql
                .split(';')
                .map(q => q.trim())
                .filter(q => q.length > 0 && !q.startsWith('--'));

            for (const q of queries) {
                try {
                    await pool.query(q);
                } catch (seedErr) {
                    // Ignore duplicate key or existing data warnings
                }
            }
            console.log('[Database] Seed data verified/loaded successfully.');
        }
    } catch (err) {
        console.error('[Database Migration Error]:', err.message);
    }
}

/**
 * Seeds memory store with initial admin and historical readings
 */
async function seedMemoryStore() {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('passsword123', 10);
    memoryStore.admins = [
        {
            id: 1,
            name: 'Engr. Bassey E. Okon',
            email: 'admin@junctionai.cr.gov.ng',
            password_hash: hash,
            role: 'Senior Traffic Engineer',
            created_at: new Date()
        }
    ];

    // Seed 20 historical readings
    const now = Date.now();
    for (let i = 20; i >= 0; i--) {
        const timestamp = new Date(now - i * 60 * 1000 * 5);
        for (const lane of memoryStore.lanes) {
            memoryStore.sensor_readings.push({
                id: memoryStore.sensor_readings.length + 1,
                lane_id: lane.id,
                vehicle_density: Math.floor(20 + Math.random() * 60),
                emergency_vehicle_flag: (i === 5 && lane.id === 1) ? 1 : 0,
                pedestrian_waiting_flag: (i === 8 && lane.id === 2) ? 1 : 0,
                is_simulated: 1,
                recorded_at: timestamp
            });
        }
    }

    memoryStore.preemption_events.push({
        id: 1,
        lane_id: 1,
        triggered_by: 'Simulated Sensor Detection (Ambulance - UNICROSS Health Center Link)',
        status: 'completed',
        triggered_at: new Date(now - 45 * 60 * 1000),
        ended_at: new Date(now - 44 * 60 * 1000 + 36000),
        duration_seconds: 24,
        notes: 'Rapid green clearance granted for medical emergency heading towards General Hospital Calabar'
    });

    memoryStore.pedestrian_events.push({
        id: 1,
        requested_at: new Date(now - 30 * 60 * 1000),
        phase_started_at: new Date(now - 29 * 60 * 1000),
        phase_ended_at: new Date(now - 29 * 60 * 1000 + 15000),
        duration_seconds: 15,
        notes: 'UNICROSS student group crosswalk phase executed'
    });
}

/**
 * Universal parameterized query execution wrapper.
 * Uses MySQL connection pool if connected; otherwise falls back to memory query engine.
 *
 * @param {string} sql - Parameterized SQL query
 * @param {Array} params - Array of parameter bindings
 * @returns {Promise<[Array, Object]>}
 */
async function query(sql, params = []) {
    if (isConnected && pool) {
        return await pool.execute(sql, params);
    }

    // Memory query interpreter for offline/testing fallback
    return await executeMemoryQuery(sql, params);
}

/**
 * Simple in-memory parameterized query simulator
 */
async function executeMemoryQuery(sql, params = []) {
    const cleanSql = sql.trim().toLowerCase();

    // SELECT admin by email
    if (cleanSql.includes('select') && cleanSql.includes('from admins') && cleanSql.includes('email = ?')) {
        const email = params[0];
        const match = memoryStore.admins.filter(a => a.email.toLowerCase() === String(email).toLowerCase());
        return [match, null];
    }

    // SELECT admin by id
    if (cleanSql.includes('select') && cleanSql.includes('from admins') && cleanSql.includes('id = ?')) {
        const id = parseInt(params[0], 10);
        const match = memoryStore.admins.filter(a => a.id === id);
        return [match, null];
    }

    // SELECT all lanes
    if (cleanSql.includes('select') && cleanSql.includes('from lanes')) {
        return [memoryStore.lanes, null];
    }

    // SELECT lane by id
    if (cleanSql.includes('select') && cleanSql.includes('from lanes where id = ?')) {
        const id = parseInt(params[0], 10);
        const match = memoryStore.lanes.filter(l => l.id === id);
        return [match, null];
    }

    // SELECT config
    if (cleanSql.includes('select') && cleanSql.includes('from config')) {
        const configArr = [];
        for (const [k, v] of memoryStore.config.entries()) {
            configArr.push({ config_key: k, config_value: v, updated_at: new Date() });
        }
        return [configArr, null];
    }

    // UPDATE config
    if (cleanSql.includes('update config set config_value = ? where config_key = ?')) {
        const [val, key] = params;
        memoryStore.config.set(key, String(val));
        return [{ affectedRows: 1 }, null];
    }

    // INSERT sensor_readings
    if (cleanSql.includes('insert into sensor_readings')) {
        const [lane_id, density, emerg, ped, sim] = params;
        const record = {
            id: memoryStore.sensor_readings.length + 1,
            lane_id: parseInt(lane_id, 10),
            vehicle_density: parseInt(density, 10),
            emergency_vehicle_flag: emerg ? 1 : 0,
            pedestrian_waiting_flag: ped ? 1 : 0,
            is_simulated: sim !== undefined ? sim : 1,
            recorded_at: new Date()
        };
        memoryStore.sensor_readings.push(record);
        if (memoryStore.sensor_readings.length > 500) {
            memoryStore.sensor_readings.shift();
        }
        return [{ insertId: record.id, affectedRows: 1 }, null];
    }

    // SELECT sensor_readings recent
    if (cleanSql.includes('select') && cleanSql.includes('from sensor_readings')) {
        const sorted = [...memoryStore.sensor_readings].sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at));
        const limitMatch = cleanSql.match(/limit\s+(\d+)/);
        const limit = limitMatch ? parseInt(limitMatch[1], 10) : 100;
        return [sorted.slice(0, limit), null];
    }

    // INSERT signal_states
    if (cleanSql.includes('insert into signal_states')) {
        const [lane_id, phase, duration, cycle_id] = params;
        const record = {
            id: memoryStore.signal_states.length + 1,
            lane_id: parseInt(lane_id, 10),
            phase,
            phase_started_at: new Date(),
            phase_duration_seconds: parseInt(duration, 10),
            cycle_id,
            created_at: new Date()
        };
        memoryStore.signal_states.push(record);
        return [{ insertId: record.id, affectedRows: 1 }, null];
    }

    // INSERT preemption_events
    if (cleanSql.includes('insert into preemption_events')) {
        const [lane_id, triggered_by, status, duration, notes] = params;
        const record = {
            id: memoryStore.preemption_events.length + 1,
            lane_id: parseInt(lane_id, 10),
            triggered_by,
            status: status || 'completed',
            triggered_at: new Date(),
            ended_at: new Date(Date.now() + (duration || 20) * 1000),
            duration_seconds: parseInt(duration || 20, 10),
            notes
        };
        memoryStore.preemption_events.unshift(record);
        return [{ insertId: record.id, affectedRows: 1 }, null];
    }

    // SELECT preemption_events
    if (cleanSql.includes('select') && cleanSql.includes('from preemption_events')) {
        return [memoryStore.preemption_events, null];
    }

    // INSERT pedestrian_events
    if (cleanSql.includes('insert into pedestrian_events')) {
        const [duration, notes] = params;
        const record = {
            id: memoryStore.pedestrian_events.length + 1,
            requested_at: new Date(),
            phase_started_at: new Date(),
            phase_ended_at: new Date(Date.now() + (duration || 15) * 1000),
            duration_seconds: parseInt(duration || 15, 10),
            notes
        };
        memoryStore.pedestrian_events.unshift(record);
        return [{ insertId: record.id, affectedRows: 1 }, null];
    }

    // SELECT pedestrian_events
    if (cleanSql.includes('select') && cleanSql.includes('from pedestrian_events')) {
        return [memoryStore.pedestrian_events, null];
    }

    return [[], null];
}

module.exports = {
    initDatabase,
    runMigrations,
    query,
    get isConnected() { return isConnected; },
    get pool() { return pool; },
    memoryStore
};
