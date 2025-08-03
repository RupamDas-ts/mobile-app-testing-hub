const express = require('express');
const bodyParser = require('body-parser');
const proxyRoutes = require('./routes/proxyRoutes');

const app = express();

// Middleware to parse JSON request bodies
app.use(bodyParser.json());

// Use the proxy routes
app.use('/', proxyRoutes);

// Start the Express server
const port = 3002;
app.listen(port, () => {
    console.log(`Proxy Service running on port ${port}`);
    console.log(`Hub endpoint available at http://localhost:${port}/wd/hub`);
}); 