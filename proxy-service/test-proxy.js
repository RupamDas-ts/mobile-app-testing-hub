const axios = require('axios');

const PROXY_URL = 'http://localhost:3002';

async function testProxyService() {
    try {
        console.log('Testing Proxy Service...\n');

        // Test health check
        console.log('1. Testing health check...');
        const healthResponse = await axios.get(`${PROXY_URL}/health`);
        console.log('Health check response:', healthResponse.data);

        // Test session creation (this will fail if SimulatorService is not running)
        console.log('\n2. Testing session creation...');
        const sessionData = {
            desiredCapabilities: {
                appId: "4647915e-ea7d-480b-80e2-543040383ca6",
                deviceName: "iPhone 16",
                platformVersion: "18.5",
                platformName: "iOS",
                automationName: "XCUITest"
            }
        };

        try {
            const sessionResponse = await axios.post(`${PROXY_URL}/wd/hub/session`, sessionData);
            console.log('Session created successfully:', sessionResponse.data);

            const sessionId = sessionResponse.data.sessionId || sessionResponse.data.value?.sessionId;

            if (sessionId) {
                // Test session info
                console.log('\n3. Testing session info...');
                const sessionInfoResponse = await axios.get(`${PROXY_URL}/sessions/${sessionId}`);
                console.log('Session info:', sessionInfoResponse.data);

                // Test session deletion
                console.log('\n4. Testing session deletion...');
                const deleteResponse = await axios.delete(`${PROXY_URL}/wd/hub/session/${sessionId}`);
                console.log('Session deleted:', deleteResponse.data);
            }
        } catch (sessionError) {
            console.log('Session creation failed (expected if SimulatorService is not running):', sessionError.message);
        }

        // Test get all sessions
        console.log('\n5. Testing get all sessions...');
        const sessionsResponse = await axios.get(`${PROXY_URL}/sessions`);
        console.log('All sessions:', sessionsResponse.data);

        console.log('\n✅ Proxy Service test completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

// Run the test
testProxyService(); 