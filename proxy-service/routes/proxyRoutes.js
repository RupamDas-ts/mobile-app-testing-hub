const express = require('express');
const router = express.Router();
const proxyController = require('../controllers/proxyController');

// Health check endpoint
router.get('/health', proxyController.healthCheck);

// Debug endpoints
router.get('/sessions', proxyController.getAllSessions);
router.get('/sessions/:sessionId', proxyController.getSessionInfo);

// Main WebDriver hub endpoint for session creation
router.post('/wd/hub/session', proxyController.createSession);

// WebDriver session management and command routing
router.delete('/wd/hub/session/:sessionId', proxyController.deleteSession);

// Catch-all route for all other WebDriver commands
// This will handle commands like:
// - GET /wd/hub/session/:sessionId/element
// - POST /wd/hub/session/:sessionId/element/:elementId/click
// - GET /wd/hub/session/:sessionId/source
// - etc.
router.all('/wd/hub/session/:sessionId/*', proxyController.forwardCommand);

// Fallback for any unmatched routes
router.use('*', (req, res) => {
    res.status(404).json({
        status: 7, // WebDriver error code for no such element
        value: {
            error: 'no such element',
            message: `Route not found: ${req.method} ${req.originalUrl}`
        }
    });
});

module.exports = router; 