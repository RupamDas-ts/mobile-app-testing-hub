# Proxy Service

A Node.js microservice that acts as a centralized hub for Appium WebDriver sessions, similar to Selenium Grid. This service manages session creation, routing, and command forwarding to individual Appium server instances.

## Overview

The Proxy Service provides a unified entry point for mobile app testing by:

- Exposing a `/wd/hub` endpoint that mimics Selenium/Appium Grid behavior
- Managing session creation and lifecycle
- Forwarding WebDriver commands to appropriate Appium servers
- Maintaining session-to-server mapping
- Integrating with SimulatorService for automated simulator setup

## Features

- **Hub-like Entry Point**: Centralized `/wd/hub` endpoint for all WebDriver operations
- **Session Management**: Automatic session creation, tracking, and cleanup
- **Command Routing**: Intelligent forwarding of WebDriver commands to correct Appium servers
- **Simulator Integration**: Seamless integration with SimulatorService for automated setup
- **Health Monitoring**: Built-in health checks and session monitoring
- **Debug Endpoints**: Administrative endpoints for session inspection

## Architecture

```
Client Test Framework
        ↓
   Proxy Service (/wd/hub)
        ↓
   SimulatorService (setup)
        ↓
   Appium Server (execution)
```

## API Endpoints

### WebDriver Hub Endpoints

#### Create Session
```
POST /wd/hub/session
```

**Request Body:**
```json
{
  "capabilities": {
    "appId": "your-app-id",
    "deviceName": "iPhone 16",
    "platformVersion": "17.0",
    "platformName": "iOS",
    "automationName": "XCUITest"
  }
}
```

**Response:**
```json
{
  "sessionId": "session-uuid",
  "status": 0,
  "value": {
    "capabilities": {
      "platformName": "iOS",
      "automationName": "XCUITest",
      "deviceName": "iPhone 16",
      "platformVersion": "17.0",
      "udid": "simulator-udid",
      "bundleId": "com.example.app"
    }
  }
}
```

#### Delete Session
```
DELETE /wd/hub/session/:sessionId
```

#### Forward Commands
```
ANY /wd/hub/session/:sessionId/*
```

Examples:
- `GET /wd/hub/session/:sessionId/element`
- `POST /wd/hub/session/:sessionId/element/:elementId/click`
- `GET /wd/hub/session/:sessionId/source`

### Administrative Endpoints

#### Health Check
```
GET /health
```

#### Get All Sessions
```
GET /sessions
```

#### Get Session Info
```
GET /sessions/:sessionId
```

## Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd proxy-service
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set environment variables:**
   ```bash
   export SIMULATOR_SERVICE_URL=http://localhost:3001
   ```

4. **Start the service:**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## Usage

### Basic Session Creation

```javascript
const axios = require('axios');

const capabilities = {
  capabilities: {
    appId: "your-app-id-from-appservice",
    deviceName: "iPhone 16",
    platformVersion: "17.0",
    platformName: "iOS",
    automationName: "XCUITest"
  }
};

const response = await axios.post('http://localhost:3002/wd/hub/session', capabilities);
const sessionId = response.data.sessionId;
```

### WebDriver Commands

```javascript
// Find element
const elementResponse = await axios.post(`http://localhost:3002/wd/hub/session/${sessionId}/element`, {
  using: 'id',
  value: 'button-id'
});

// Click element
await axios.post(`http://localhost:3002/wd/hub/session/${sessionId}/element/${elementId}/click`);

// Get page source
const sourceResponse = await axios.get(`http://localhost:3002/wd/hub/session/${sessionId}/source`);
```

### Session Cleanup

```javascript
// Delete session
await axios.delete(`http://localhost:3002/wd/hub/session/${sessionId}`);
```

## Configuration

### Environment Variables

- `SIMULATOR_SERVICE_URL`: URL of the SimulatorService (default: `http://localhost:3001`)
- `PORT`: Port for the proxy service (default: `3002`)

### Session Management

The service maintains an in-memory session map. For production deployments, consider:

- Using Redis for session storage
- Implementing session persistence
- Adding session timeout and cleanup mechanisms

## Docker Deployment

```bash
# Build the image
docker build -t proxy-service .

# Run the container
docker run -p 3002:3002 \
  -e SIMULATOR_SERVICE_URL=http://simulator-service:3001 \
  proxy-service
```

## Integration with Other Services

### SimulatorService Integration

The ProxyService automatically integrates with SimulatorService to:

1. Receive session creation requests with `appId`, `deviceName`, and `platformVersion`
2. Forward setup requests to SimulatorService
3. Receive simulator UDID and app bundle ID
4. Create Appium sessions with the provided information

### AppService Integration

The ProxyService works with AppService through SimulatorService:

1. Client provides `appId` in session capabilities
2. SimulatorService fetches app data from AppService using the `appId`
3. App is installed on the simulator
4. Session is created with the installed app

## Error Handling

The service implements standard WebDriver error codes:

- `status: 7` - No such element
- `status: 13` - Unknown error
- `status: 6` - No such session

## Monitoring and Debugging

### Health Checks

```bash
curl http://localhost:3002/health
```

### Session Monitoring

```bash
# List all active sessions
curl http://localhost:3002/sessions

# Get specific session info
curl http://localhost:3002/sessions/session-id
```

### Logs

The service provides comprehensive logging for:

- Session creation and deletion
- Command forwarding
- Error conditions
- Integration with other services

## Troubleshooting

### Common Issues

1. **Session not found**: Check if the session ID is valid and the session hasn't expired
2. **SimulatorService connection**: Verify SimulatorService is running and accessible
3. **Appium server connection**: Ensure Appium server is running on the expected port
4. **Missing capabilities**: Verify all required capabilities are provided in session creation

### Debug Mode

Enable debug logging by setting the log level:

```bash
export DEBUG=proxy-service:*
npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details. 