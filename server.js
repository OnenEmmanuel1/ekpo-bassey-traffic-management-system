/**
 * JunctionAI - Server Entry Point
 * Intelligent Traffic Control System (ITCS)
 * Location: Ekpo-Abasi Junction, Calabar South LGA, Cross River State
 */

const express = require('express');
const path = require('path');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config();

const { initDatabase } = require('./config/db');
const sessionMiddleware = require('./config/session');
const engine = require('./engine/itcsEngine');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// API Route Modules
const junctionApi = require('./routes/api/junction');
const configApi = require('./routes/api/config');
const analyticsApi = require('./routes/api/analytics');
const reportsApi = require('./routes/api/reports');

// Page Route Modules
const authPages = require('./routes/pages/auth');
const dashboardPages = require('./routes/pages/dashboard');
const analyticsPages = require('./routes/pages/analytics');
const preemptionPages = require('./routes/pages/preemption');
const pedestrianPages = require('./routes/pages/pedestrian');
const configPages = require('./routes/pages/configuration');
const reportsPages = require('./routes/pages/reports');

const app = express();
const PORT = process.env.PORT || 3000;

// View Engine Setup (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Security & Utility Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'"]
        }
    }
}));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Management
app.use(sessionMiddleware);

// Static Asset Directory
app.use(express.static(path.join(__dirname, 'public')));

// Mount API Endpoints (routes/api/*.js)
app.use('/api/junction', junctionApi);
app.use('/api/config', configApi);
app.use('/api/analytics', analyticsApi);
app.use('/api/reports', reportsApi);

// Mount Page Rendering Endpoints (routes/pages/*.js)
app.use('/', authPages);
app.use('/', dashboardPages);
app.use('/', analyticsPages);
app.use('/', preemptionPages);
app.use('/', pedestrianPages);
app.use('/', configPages);
app.use('/', reportsPages);

// 404 & Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

// Bootstrapping Database & ITCS Engine
async function startServer() {
    try {
        console.log('====================================================');
        console.log('           JunctionAI - ITCS Control Core           ');
        console.log(' Location: Ekpo-Abasi Junction, Calabar South, CRS  ');
        console.log('====================================================');

        // 1. Initialize Database & Run Migrations
        await initDatabase();

        // 2. Start ITCS Business Logic Engine
        await engine.start();

        // 3. Start HTTP Server
        app.listen(PORT, () => {
            console.log(`[JunctionAI Server] Online and listening on http://localhost:${PORT}`);
            console.log(`[JunctionAI Admin] Default login: admin@junctionai.cr.gov.ng / password123`);
        });
    } catch (err) {
        console.error('[Server Fatal Error]:', err);
        process.exit(1);
    }
}

startServer();
