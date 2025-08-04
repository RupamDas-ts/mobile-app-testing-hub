# Mobile Testing Hub

A comprehensive mobile app testing system that combines Docker containers with local macOS services for iOS simulator integration.

## Architecture

This system uses a hybrid approach:
- **Docker containers**: `app-service`, `proxy-service`, `redis`
- **Local macOS**: `simulator-service` (runs directly on host for Xcode integration)

### Services

1. **App Service** (Docker - Port 3000)
   - Manages app uploads and metadata
   - Stores app information in Redis
   - RESTful API for app management

2. **Simulator Service** (Local macOS - Port 3001)
   - Manages iOS simulators via Xcode
   - Installs and launches apps on simulators
   - Starts and manages Appium server locally
   - **Must run locally on macOS** for Xcode simulator access

3. **Appium Server** (Local macOS - Port 4723)
   - Runs directly on macOS host (started by simulator service)
   - Handles WebDriver commands for iOS automation
   - Communicates with iOS simulators via XCUITest
   - **Must run locally on macOS** for iOS simulator access

4. **Proxy Service** (Docker - Port 3002)
   - Orchestrates communication between services
   - Manages test sessions
   - Forwards WebDriver commands to local Appium server
   - Provides unified API interface

5. **Redis** (Docker - Port 6379)
   - Stores app metadata and session information
   - Provides caching and data persistence

## Prerequisites

### For Docker Services
- Docker and Docker Compose
- Node.js 18+ (for local development)

### For Local Simulator Service
- macOS (required for Xcode simulators)
- Xcode with iOS Simulator
- Node.js 18+
- Appium (will be installed automatically)

## Quick Start

### 1. Start Docker Services

```bash
# Start app-service, proxy-service, and redis
docker compose up -d
```

### 2. Start Local Simulator Service

```bash
# Make the script executable (first time only)
chmod +x start-simulator-service.sh

# Start the simulator service
./start-simulator-service.sh
```

### 3. Verify Services

```bash
# Check Docker services
docker compose ps

# Check local simulator service
curl http://localhost:3001/api/health
```

## API Endpoints

### App Service (Port 3000)
- `POST /api/upload` - Upload mobile app
- `GET /api/apps/:id` - Get app details
- `GET /api/health` - Health check

### Simulator Service (Port 3001)
- `POST /api/simulate` - Start simulator and install app
- `POST /api/cleanup` - Cleanup simulators and processes
- `GET /api/health` - Health check

### Proxy Service (Port 3002)
- `POST /api/test` - Start test session
- `GET /api/status` - Get test status
- `GET /api/health` - Health check

## Development

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mobile-testing-hub
   ```

2. **Install dependencies for local services**
   ```bash
   cd simulator-service
   npm install
   ```

3. **Start services**
   ```bash
   # Terminal 1: Start Docker services
   docker compose up -d
   
   # Terminal 2: Start local simulator service
   ./start-simulator-service.sh
   ```

### Testing the Setup

1. **Upload an app**
   ```bash
   curl -X POST http://localhost:3000/api/upload \
     -F "appFile=@path/to/your/app.ipa"
   ```

2. **Start a simulator session**
   ```bash
   curl -X POST http://localhost:3001/api/simulate \
     -H "Content-Type: application/json" \
     -d '{
       "appId": "your-app-id",
       "deviceName": "iPhone 16 Pro",
       "platformVersion": "18.5"
     }'
   ```

## Configuration

### Environment Variables

#### App Service
- `REDIS_HOST` - Redis host (default: redis)
- `REDIS_PORT` - Redis port (default: 6379)
- `NODE_ENV` - Environment (default: production)

#### Simulator Service
- `APP_SERVICE_URL` - App service URL (default: http://localhost:3000)
- `PORT` - Service port (default: 3001)
- `NODE_ENV` - Environment (default: development)

#### Proxy Service
- `SIMULATOR_SERVICE_URL` - Simulator service URL (default: http://host.docker.internal:3001)
- `NODE_ENV` - Environment (default: production)

## Troubleshooting

### Common Issues

1. **Simulator service can't connect to app service**
   - Ensure app service is running: `docker compose ps`
   - Check app service logs: `docker compose logs app-service`

2. **Xcode simulator issues**
   - Verify Xcode is installed: `xcrun simctl list devices`
   - Check Xcode command line tools: `xcode-select --install`

3. **Appium issues**
   - Appium is installed automatically by the simulator service
   - Check Appium logs in simulator service output

### Logs

```bash
# Docker services
docker compose logs app-service
docker compose logs proxy-service
docker compose logs redis

# Local simulator service
# Logs are displayed in the terminal where you started it
```

## Architecture Benefits

- **Performance**: Simulator service runs natively on macOS for optimal Xcode integration
- **Scalability**: Docker services can be easily scaled and deployed
- **Development**: Local simulator service allows for easy debugging and development
- **Production**: Docker services provide consistent deployment environments

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

[Add your license information here] 