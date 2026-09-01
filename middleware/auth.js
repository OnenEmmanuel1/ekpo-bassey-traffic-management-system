/**
 * Authentication Middleware
 * JunctionAI - Intelligent Traffic Control System
 *
 * Ensures only authenticated Traffic Authority Administrators access the console & protected APIs.
 */

function requireAuth(req, res, next) {
    if (req.session && req.session.admin) {
        // Expose admin object to EJS templates via res.locals
        res.locals.admin = req.session.admin;
        return next();
    }

    // If API request, return JSON 401
    if (req.originalUrl.startsWith('/api/')) {
        return res.status(401).json({
            success: false,
            error: 'Authentication Required',
            message: 'You must be logged in as a Traffic Authority Administrator to access this endpoint.'
        });
    }

    // Otherwise redirect to login page
    return res.redirect('/login');
}

function redirectIfAuthenticated(req, res, next) {
    if (req.session && req.session.admin) {
        return res.redirect('/dashboard');
    }
    next();
}

module.exports = {
    requireAuth,
    redirectIfAuthenticated
};
