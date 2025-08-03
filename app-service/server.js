const express = require('express');
const app = express();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const appRoutes = require('./routes/appRoutes');

const port = process.env.PORT || 3000;

// Middleware for parsing JSON and form-data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up routes
app.use('/api', appRoutes);

app.listen(port, () => {
    console.log(`App Service running on port ${port}`);
});
