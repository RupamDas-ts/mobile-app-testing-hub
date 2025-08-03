const redis = require('redis');
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');

// Create Redis client with proper error handling
let client;

async function createRedisClient() {
    const newClient = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        socket: {
            reconnectStrategy: (retries) => {
                if (retries > 5) {
                    console.log('Too many retries. Connection terminated');
                    return new Error('Connection failed');
                }
                return Math.min(retries * 100, 5000);
            }
        }
    });

    newClient.on('error', (err) => {
        console.error('Redis error:', err);
    });

    await newClient.connect();
    return newClient;
}

// Initialize Redis client on startup
(async () => {
    try {
        client = await createRedisClient();
        console.log('Redis client connected');
    } catch (err) {
        console.error('Failed to connect to Redis:', err);
    }
})();

// Store app in Redis
exports.storeApp = async (file) => {
    if (!client) {
        throw new Error('Redis client not initialized');
    }

    try {
        if (!file || !file.buffer) {
            throw new Error('Invalid file object');
        }

        const appId = uuidv4();
        const appData = {
            id: appId,
            name: file.originalname,
            size: file.size,
            contentType: file.mimetype,
            data: file.buffer.toString('base64')
        };

        // Check if connection is alive
        if (!client.isOpen) {
            await client.connect();
        }

        await client.hSet('apps', appId, JSON.stringify(appData));
        return appId;
    } catch (error) {
        console.error('Error storing app in Redis:', error);
        throw error;
    }
};

// Get app details from Redis
exports.getAppDetails = async (appId) => {
    if (!client) {
        throw new Error('Redis client not initialized');
    }

    try {
        if (!appId) {
            throw new Error('App ID is required');
        }

        // Check if connection is alive
        if (!client.isOpen) {
            await client.connect();
        }

        const appData = await client.hGet('apps', appId);
        return appData ? JSON.parse(appData) : null;
    } catch (error) {
        console.error('Error fetching app details from Redis:', error);
        throw error;
    }
};