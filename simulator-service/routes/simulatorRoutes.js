const express = require('express');
const router = express.Router();
const simulatorController = require('../controllers/simulatorController');

// Route to start the simulator and install the app
router.post('/simulate', simulatorController.setupSimulatorAndApp);

// Route to perform cleanup by stopping all simulators, Xcode, and Appium
router.post('/cleanup', simulatorController.cleanup);

// Route to open simulator window (for debugging)
router.post('/open-simulator', simulatorController.openSimulatorWindow);

// Route to get Appium logs (for debugging)
router.get('/appium-logs', simulatorController.getAppiumLogs);

module.exports = router;