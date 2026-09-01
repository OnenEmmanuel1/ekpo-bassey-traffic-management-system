/**
 * Error Handling Middleware
 * JunctionAI - Intelligent Traffic Control System
 */

function errorHandler(err, req, res, next) {
    console.error('[ITCS Error]:', err.stack || err.message);

    if (req.originalUrl.startsWith('/api/')) {
        return res.status(err.status || 500).json({
            success: false,
            error: err.name || 'InternalServerError',
            message: err.message || 'An unexpected traffic controller error occurred'
        });
    }

    res.status(err.status || 500).render('pages/error', {
        title: 'System Error | JunctionAI',
        error: err,
        status: err.status || 500,
        currentPath: req.path
    });
}

function notFoundHandler(req, res) {
    if (req.originalUrl.startsWith('/api/')) {
        return res.status(404).json({
            success: false,
            error: 'NotFound',
            message: `Resource ${req.originalUrl} not found`
        });
    }

    res.status(404).render('pages/error', {
        title: 'Page Not Found | JunctionAI',
        error: { message: `The requested console path (${req.originalUrl}) does not exist.` },
        status: 404,
        currentPath: req.path
    });
}

module.exports = {
    errorHandler,
    notFoundHandler
};
