# Simulator Service

A Node.js microservice for managing iOS simulators, installing apps, and performing cleanup operations. This service integrates with the AppService to fetch app data and provides endpoints for simulator management.

## Features

- **Simulator Management**: Boot iOS simulators by device name
- **App Installation**: Install iOS apps on simulators using base64 encoded app data
- **Bundle ID Extraction**: Extract bundle identifiers from installed apps
- **Cleanup Operations**: Shutdown simulators, Xcode, and Appium processes
- **Integration**: Works with AppService to fetch app data

## Prerequisites

- **macOS**: This service is designed to run on macOS systems
- **Xcode**: Must be installed with iOS Simulator support
- **Node.js**: Version 14 or higher
- **Redis**: Required for AppService integration
- **Command Line Tools**: `xcrun`, `jq`, `unzip` must be available

## Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd simulator-service
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   Ensure the following services are running:
   - AppService on port 3000
   - Redis server

## Usage

### Starting the Service

```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

The service will start on port 3001 by default.

### API Endpoints

#### 1. Setup Simulator and Install App

**POST** `/api/simulate`

Sets up a simulator, installs an app, and returns the UDID and bundle ID.

**Request Body**:
```json
{
  "deviceName": "iPhone 16",
  "platformVersion": "17.0",
  "appId": "your-app-id-from-appservice"
}
```

**Response**:
```json
{
  "udid": "simulator-udid",
  "bundleId": "com.example.app"
}
```

**Example**:
```bash
curl -X POST http://localhost:3001/api/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "deviceName": "iPhone 16",
    "platformVersion": "17.0",
    "appId": "123e4567-e89b-12d3-a456-426614174000"
  }'
```

#### 2. Cleanup

**POST** `/api/cleanup`

Shuts down all running simulators, Xcode, and Appium processes.

**Response**:
```json
{
  "message": "Cleanup successful: Simulators, Xcode, and Appium have been stopped if they were running."
}
```

**Example**:
```bash
curl -X POST http://localhost:3001/api/cleanup
```

## Architecture

### Service Flow

1. **App Fetching**: Retrieves app data from AppService using the provided `appId`
2. **Simulator Boot**: Starts the specified iOS simulator if not already running
3. **App Processing**: Extracts the base64 encoded app data and finds the `.app` directory
4. **App Installation**: Installs the app on the simulator using `xcrun simctl install`
5. **Bundle ID Extraction**: Reads the bundle identifier from the app's `Info.plist`

### Key Components

- **`simulatorController.js`**: Main controller handling simulator operations
- **`simulatorRoutes.js`**: Express routes for API endpoints
- **`server.js`**: Express server setup and configuration

### Dependencies

- **express**: Web framework
- **axios**: HTTP client for AppService communication
- **child_process**: System command execution
- **fs**: File system operations
- **path**: Path manipulation utilities

## Error Handling

The service includes comprehensive error handling for:

- Simulator not found
- App installation failures
- Bundle ID extraction errors
- Network communication issues
- File system operations

## Development

### Project Structure

```
simulator-service/
├── controllers/
│   └── simulatorController.js    # Main business logic
├── routes/
│   └── simulatorRoutes.js        # API route definitions
├── server.js                     # Express server setup
├── package.json                  # Dependencies and scripts
└── README.md                     # This file
```

### Available Scripts

- `npm start`: Start the service in production mode
- `npm run dev`: Start the service in development mode with auto-restart

## Troubleshooting

### Common Issues

1. **Simulator not found**:
   - Ensure the device name matches exactly with available simulators
   - Run `xcrun simctl list devices` to see available devices

2. **App installation fails**:
   - Verify the app data is properly base64 encoded
   - Check that the app is compatible with the simulator's iOS version

3. **Bundle ID extraction fails**:
   - Ensure the app contains a valid `Info.plist` file
   - Verify the app structure is correct

4. **Permission errors**:
   - Ensure the service has necessary permissions to execute `xcrun` commands
   - Check Xcode installation and command line tools

### Debugging

Enable detailed logging by checking the console output. The service provides comprehensive logging for all operations.

## Integration

This service is designed to work as part of a larger mobile app testing infrastructure:

- **AppService**: Provides app data and management
- **ProxyService**: Orchestrates testing workflows
- **Test Services**: Execute automated tests on the prepared simulators

## License

MIT License - see LICENSE file for details.