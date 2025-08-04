const redis = require('redis');
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');

// Configuration
const REDIS_CONFIG = {
    // Remove duplicate host/port (socket takes precedence)
    socket: {
        host: process.env.REDIS_HOST || 'redis',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        family: 4,
        tls: false,
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
            console.log(`Redis reconnection attempt ${retries}`);
            return Math.min(retries * 100, 5000);
        }
    },
    password: process.env.REDIS_PASSWORD || undefined, // undefined is better than null for Redis
    disableOfflineQueue: true
};


// Redis client instance
let client;

/**
 * Creates and connects a new Redis client
 * @returns {Promise<redis.RedisClient>}
 */
async function createRedisClient() {
    console.log('Connecting to Redis at', REDIS_CONFIG.socket.host);

    const newClient = redis.createClient(REDIS_CONFIG);

    newClient.on('error', (err) => {
        if (err.code === 'ECONNREFUSED') {
            console.error('Redis connection refused - is Redis running?');
        } else if (err.code === 'NOAUTH') {
            console.error('Redis authentication failed - check password');
        } else {
            console.error('Redis error:', err.message);
        }
    });

    newClient.on('connect', () => console.log('Redis connecting...'));
    newClient.on('ready', () => console.log('Redis client ready'));
    newClient.on('reconnecting', () => console.log('Redis reconnecting...'));

    try {
        await newClient.connect();
        await newClient.ping(); // Test connection immediately
        return newClient;
    } catch (err) {
        console.error('Redis connection failed:', err.message);
        throw err;
    }
}

/**
 * Ensures active Redis connection
 * @returns {Promise<void>}
 */
async function ensureConnected() {
    if (!client || !client.isOpen) {
        try {
            client = await createRedisClient();
        } catch (err) {
            throw new Error(`Redis connection failed: ${err.message}`);
        }
    }
}

// Initialize on startup
(async function initializeRedis() {
    try {
        client = await createRedisClient();
        console.log('Redis client connected successfully');
    } catch (err) {
        console.error('Critical: Failed to initialize Redis', err);
        // process.exit(1); // Uncomment if Redis is critical for your app
    }
})();

// Service Methods

/**
 * Stores app in Redis
 * @param {Express.Multer.File} file 
 * @returns {Promise<string>} appId
 */
exports.storeApp = async (file) => {
    try {
        await ensureConnected();

        if (!file?.buffer) {
            throw new Error('Invalid file object');
        }

        const appId = uuidv4();
        const appData = {
            id: appId,
            name: file.originalname,
            size: file.size,
            contentType: file.mimetype,
            data: file.buffer.toString('base64'),
            createdAt: new Date().toISOString()
        };

        await client.hSet('apps', appId, JSON.stringify(appData));
        return appId;
    } catch (error) {
        console.error('Error storing app:', error.message);
        throw new Error(`Failed to store app: ${error.message}`);
    }
};

/**
 * Gets app details from Redis
 * @param {string} appId 
 * @returns {Promise<Object|null>} appData
 */
exports.getAppDetails = async (appId) => {
    try {
        await ensureConnected();

        if (!appId) {
            throw new Error('App ID is required');
        }

        const appData = await client.hGet('apps', appId);
        return appData ? JSON.parse(appData) : null;
    } catch (error) {
        console.error('Error fetching app:', error.message);
        throw new Error(`Failed to fetch app: ${error.message}`);
    }
};

/**
 * Health check for Redis
 * @returns {Promise<boolean>}
 */
exports.checkHealth = async () => {
    try {
        await ensureConnected();
        await client.ping();
        return true;
    } catch {
        return false;
    }
};