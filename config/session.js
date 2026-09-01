/**
 * Session Configuration
 * JunctionAI - Intelligent Traffic Control System
 */

const session = require('express-session');
require('dotenv').config();

const sessionMiddleware = session({
    name: 'junctionai.sid',
    secret: process.env.SESSION_SECRET || 'junctionai_super_secret_ekpo_abasi_2026_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 12, // 12 hours
        sameSite: 'lax'
    }
});

module.exports = sessionMiddleware;
