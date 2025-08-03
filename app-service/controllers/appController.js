const multer = require('multer');
const appService = require('../services/appService');

// Set up multer for file storage (using memory storage for simplicity)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Controller to handle app uploads
exports.uploadApp = async (req, res) => {
    // Use multer's middleware directly in the route
    upload.single('appFile')(req, res, async (err) => {
        if (err) {
            // Handle the error if multer fails
            return res.status(400).json({ message: 'Error uploading file', error: err.message });
        }

        try {
            if (!req.file) {
                return res.status(400).json({ message: 'No file uploaded' });
            }

            const appId = await appService.storeApp(req.file); // Store app in Redis
            res.status(200).json({ message: 'App uploaded successfully', appId: appId });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error uploading app' });
        }
    });
};

// Controller to fetch app details (optional)
exports.getAppDetails = async (req, res) => {
    try {
        const appId = req.params.appId;
        const app = await appService.getAppDetails(appId);

        if (!app) {
            return res.status(404).json({ message: 'App not found' });
        }

        res.status(200).json({ app });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching app details' });
    }
};
