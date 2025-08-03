const express = require('express');
const router = express.Router();
const appController = require('../controllers/appController');

// Route to upload an app
router.post('/upload', (req, res) => {
    console.log('uploading app');
    appController.uploadApp(req, res);
});

// Route to get app details (optional)
router.get('/apps/:appId', appController.getAppDetails);

module.exports = router;
