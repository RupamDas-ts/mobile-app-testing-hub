const express = require('express');
const router = express.Router();
const appController = require('../controllers/appController');

// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        service: 'app-service',
        timestamp: new Date().toISOString(),
        redis: 'checking' // We'll add Redis status later if needed
    });
});

// Route to upload an app
router.post('/upload', (req, res) => {
    console.log('uploading app');
    appController.uploadApp(req, res);
});

// Route to get app details (optional)
router.get('/apps/:appId', appController.getAppDetails);

module.exports = router;
