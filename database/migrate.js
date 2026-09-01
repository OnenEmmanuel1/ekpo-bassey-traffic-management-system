/**
 * Standalone Database Migration Script
 * JunctionAI - Intelligent Traffic Control System
 */

const { initDatabase } = require('../config/db');

async function main() {
    console.log('[Migration] Starting database migration for JunctionAI...');
    await initDatabase();
    console.log('[Migration] Migration process complete.');
    process.exit(0);
}

main().catch(err => {
    console.error('[Migration Failed]:', err);
    process.exit(1);
});
