const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const simulatorRoutes = require('./routes/simulatorRoutes');

// Middleware to parse JSON request bodies
app.use(bodyParser.json());

// Use the simulator-related routes
app.use('/api', simulatorRoutes);

// Start the Express server
const port = 3001;
app.listen(port, () => {
    console.log(`Simulator Service running on port ${port}`);
});