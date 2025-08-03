const proxyService = require('../services/proxyService');

// Handle session creation
exports.createSession = async (req, res) => {
    try {
        console.log('Received session creation request:', JSON.stringify(req.body, null, 2));

        const sessionData = await proxyService.createSession(req.body);
        res.status(200).json(sessionData);
    } catch (error) {
        console.error('Error in createSession:', error.message);

        // Determine appropriate WebDriver error code based on error type
        let errorCode = 13; // unknown error
        let errorType = 'unknown error';

        if (error.message.includes('Appium server is not running')) {
            errorCode = 6; // no such session
            errorType = 'no such session';
        } else if (error.message.includes('timed out')) {
            errorCode = 21; // timeout
            errorType = 'timeout';
        } else if (error.message.includes('bad request')) {
            errorCode = 400; // invalid argument
            errorType = 'invalid argument';
        } else if (error.message.includes('Missing required capabilities')) {
            errorCode = 400; // invalid argument
            errorType = 'invalid argument';
        }

        res.status(500).json({
            status: errorCode,
            value: {
                error: errorType,
                message: error.message,
                stacktrace: error.stack
            }
        });
    }
};

// Handle session deletion
exports.deleteSession = async (req, res) => {
    try {
        const sessionId = req.params.sessionId;
        console.log('Received session deletion request for:', sessionId);

        const result = await proxyService.deleteSession(sessionId);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error in deleteSession:', error.message);
        res.status(500).json({
            status: 13,
            value: {
                error: 'unknown error',
                message: error.message
            }
        });
    }
};

// Handle all other WebDriver commands
exports.forwardCommand = async (req, res) => {
    try {
        const sessionId = req.params.sessionId;
        const method = req.method;
        const path = req.path.replace(`/wd/hub/session/${sessionId}`, `/wd/hub/session/${sessionId}`);

        console.log(`Forwarding command: ${method} ${path} for session ${sessionId}`);

        const result = await proxyService.forwardCommand(sessionId, method, path, req.body);

        // Return the exact response from Appium without modification
        res.status(result.status || 200).json(result.data || result);
    } catch (error) {
        console.error('Error in forwardCommand:', error.message);

        // If it's an Appium error response, preserve it
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({
                status: 13,
                value: {
                    error: 'unknown error',
                    message: error.message
                }
            });
        }
    }
};

// Get session info (for debugging)
exports.getSessionInfo = async (req, res) => {
    try {
        const sessionId = req.params.sessionId;
        const sessionInfo = proxyService.getSessionInfo(sessionId);

        if (!sessionInfo) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.status(200).json({
            sessionId,
            ...sessionInfo
        });
    } catch (error) {
        console.error('Error in getSessionInfo:', error.message);
        res.status(500).json({ error: error.message });
    }
};

// Get all active sessions (for debugging)
exports.getAllSessions = async (req, res) => {
    try {
        const sessions = proxyService.getAllSessions();
        res.status(200).json({ sessions });
    } catch (error) {
        console.error('Error in getAllSessions:', error.message);
        res.status(500).json({ error: error.message });
    }
};

// Health check endpoint
exports.healthCheck = async (req, res) => {
    res.status(200).json({
        status: 'healthy',
        service: 'proxy-service',
        timestamp: new Date().toISOString()
    });
}; 