const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// In-memory storage for session mapping
// In production, this should be replaced with Redis or a database
const sessionMap = new Map();

class ProxyService {
    constructor() {
        this.simulatorServiceUrl = process.env.SIMULATOR_SERVICE_URL || 'http://localhost:3001';
        this.appiumServerUrl = process.env.APPIUM_SERVER_URL || 'http://localhost:4723';
    }

    // Create a new session by forwarding to SimulatorService
    /**
     * Sample request payload:
        {
            "capabilities": {
                "firstMatch": [
                    {
                        "appium:appId": "4647915e-ea7d-480b-80e2-543040383ca6",
                        "appium:wdaLaunchTimeout": 30000,
                        "appium:deviceName": "iPhone 16 Pro Max",
                        "platformName": "IOS",
                        "appium:automationName": "XCUITest",
                        "appium:platformVersion": "18.5"
                    }
                ]
            }
        }
        Sample final capabilities after getting appid and udid from simulator service, this is the payload that is sent to appium server:
        {
            "capabilities": {
                "firstMatch": [
                    {
                        "appium:udid": "53DFCED5-2A12-4504-A376-A04A3CB77EA2",
                        "appium:wdaLaunchTimeout": 30000,
                        "appium:bundleId": "io.appium.TestApp",
                        "appium:deviceName": "iPhone 16 Pro Max",
                        "platformName": "IOS",
                        "appium:automationName": "XCUITest",
                        "appium:platformVersion": "18.5"
                    }
                ]
            }
        }
        
        Note: Proxy service exposes /wd/hub endpoints but forwards to Appium's root path (/session, /session/:id/*)
     */
    async createSession(capabilities) {
        try {
            console.log('Creating session with capabilities:', JSON.stringify(capabilities, null, 2));
            console.log('First match object:', JSON.stringify(capabilities.capabilities.firstMatch[0], null, 2));

            // Extract required parameters from capabilities
            const firstMatch = capabilities.capabilities.firstMatch[0];
            const appId = firstMatch['appium:appId'];
            const deviceName = firstMatch['appium:deviceName'];
            const platformVersion = firstMatch['appium:platformVersion'];

            // Create a copy of otherCapabilities without the extracted fields
            const otherCapabilities = { ...firstMatch };
            delete otherCapabilities['appium:appId'];
            delete otherCapabilities['appium:deviceName'];
            delete otherCapabilities['appium:platformVersion'];

            console.log('Extracted values:', { appId, deviceName, platformVersion });
            console.log('Other capabilities:', JSON.stringify(otherCapabilities, null, 2));

            if (!appId || !deviceName || !platformVersion) {
                throw new Error('Missing required capabilities: appId, deviceName, platformVersion');
            }

            // Call SimulatorService to setup simulator and start Appium
            const simulatorResponse = await axios.post(`${this.simulatorServiceUrl}/api/simulate`, {
                deviceName,
                platformVersion,
                appId
            });

            console.log('Simulator response:', simulatorResponse.data);

            const { udid, bundleId } = simulatorResponse.data;

            // Use the configured Appium server URL
            const appiumServerUrl = this.appiumServerUrl;

            // Final capabilities - maintain W3C structure
            const finalCapabilities = {
                firstMatch: [
                    {
                        ...otherCapabilities,
                        platformName: 'IOS',
                        'appium:automationName': 'XCUITest',
                        'appium:deviceName': deviceName,
                        'appium:platformVersion': platformVersion,
                        'appium:udid': udid,
                        'appium:bundleId': bundleId
                    }
                ]
            }

            console.log('Final capabilities:', JSON.stringify(finalCapabilities, null, 2));

            // Create session on the Appium server
            console.log(`Attempting to create session on Appium server: ${appiumServerUrl}`);

            try {
                const sessionResponse = await axios.post(`${appiumServerUrl}/session`, {
                    capabilities: finalCapabilities
                }, {
                    timeout: 30000, // 30 second timeout
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                console.log('Appium server response:', JSON.stringify(sessionResponse.data, null, 2));

                const sessionId = sessionResponse.data.sessionId || sessionResponse.data.value?.sessionId;

                if (!sessionId) {
                    throw new Error('Appium server response did not contain a valid session ID');
                }

                // Store session mapping
                sessionMap.set(sessionId, {
                    appiumServerUrl,
                    udid,
                    bundleId,
                    createdAt: new Date()
                });

                console.log(`Session created successfully: ${sessionId}`);
                return sessionResponse.data;

            } catch (appiumError) {
                console.error('Appium server error details:', {
                    status: appiumError.response?.status,
                    statusText: appiumError.response?.statusText,
                    data: appiumError.response?.data,
                    message: appiumError.message
                });

                if (appiumError.code === 'ECONNREFUSED') {
                    throw new Error('Appium server is not running. Please start Appium server on port 4723');
                } else if (appiumError.code === 'ETIMEDOUT') {
                    throw new Error('Appium server request timed out. Server may be overloaded or not responding');
                } else if (appiumError.response?.status === 500) {
                    throw new Error(`Appium server internal error: ${JSON.stringify(appiumError.response.data)}`);
                } else if (appiumError.response?.status === 400) {
                    throw new Error(`Appium server bad request: ${JSON.stringify(appiumError.response.data)}`);
                } else {
                    throw new Error(`Appium server error (${appiumError.response?.status || 'unknown'}): ${appiumError.message}`);
                }
            }

        } catch (error) {
            console.error('Error creating session:', error.message);
            console.error('Full error details:', {
                message: error.message,
                stack: error.stack,
                response: error.response?.data
            });
            throw new Error(`Failed to create session: ${error.message}`);
        }
    }

    // Forward WebDriver commands to the appropriate Appium server
    async forwardCommand(sessionId, method, path, data = null) {
        try {
            const sessionInfo = sessionMap.get(sessionId);

            if (!sessionInfo) {
                throw new Error(`Session ${sessionId} not found`);
            }

            // Convert /wd/hub/session/:sessionId/* to /session/:sessionId/*
            const appiumPath = path.replace('/wd/hub', '');
            const url = `${sessionInfo.appiumServerUrl}${appiumPath}`;
            console.log(`Forwarding ${method} ${path} to ${url}`);

            const config = {
                method: method.toLowerCase(),
                url: url,
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            if (data) {
                config.data = data;
            }

            const response = await axios(config);

            // Return the complete response object to preserve status codes and headers
            return {
                status: response.status,
                data: response.data,
                headers: response.headers
            };

        } catch (error) {
            console.error(`Error forwarding command for session ${sessionId}:`, error.message);

            // Re-throw the error to preserve Appium's error response
            throw error;
        }
    }

    // Delete a session
    async deleteSession(sessionId) {
        try {
            const sessionInfo = sessionMap.get(sessionId);

            if (!sessionInfo) {
                throw new Error(`Session ${sessionId} not found`);
            }

            // Delete session on Appium server
            await axios.delete(`${sessionInfo.appiumServerUrl}/session/${sessionId}`);

            // Remove from session map
            sessionMap.delete(sessionId);

            console.log(`Session ${sessionId} deleted successfully`);
            return { success: true };

        } catch (error) {
            console.error(`Error deleting session ${sessionId}:`, error.message);
            throw new Error(`Failed to delete session: ${error.message}`);
        }
    }

    // Get session info
    getSessionInfo(sessionId) {
        return sessionMap.get(sessionId);
    }

    // Get all active sessions
    getAllSessions() {
        const sessions = [];
        for (const [sessionId, info] of sessionMap.entries()) {
            sessions.push({
                sessionId,
                ...info
            });
        }
        return sessions;
    }

    // Clean up expired sessions (optional)
    cleanupExpiredSessions(maxAgeHours = 24) {
        const now = new Date();
        const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds

        for (const [sessionId, info] of sessionMap.entries()) {
            if (now - info.createdAt > maxAge) {
                console.log(`Cleaning up expired session: ${sessionId}`);
                sessionMap.delete(sessionId);
            }
        }
    }
}

module.exports = new ProxyService(); 