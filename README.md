# Mobile Testing Hub

A **Docker-based distributed system** for automated iOS mobile application testing using Appium, Xcode, and iOS Simulators. This project provides a centralized hub architecture similar to Selenium/Appium Grid, enabling seamless mobile app testing automation.

## 🏗️ Architecture

The system consists of **three microservices** working together:

- **📱 App Management Service** - Handles app uploads and metadata storage
- **🖥️ Simulator Management Service** - Manages iOS simulators and Appium server instances  
- **🔗 Appium Proxy Service** - Central hub endpoint that routes WebDriver commands

## ✨ Key Features

- **Hub-like Architecture**: Single entry point (`/wd/hub`) for all test automation requests
- **Dynamic Simulator Management**: Automatic iOS simulator booting and app installation
- **Session Routing**: Intelligent routing of WebDriver commands to appropriate Appium instances
- **Docker Containerization**: Easy deployment and scaling with Docker Compose
- **Redis Integration**: Efficient app metadata and session management
- **Health Checks**: Built-in health monitoring for all services

## 🛠️ Tech Stack

- **Backend**: Node.js 18, Express.js
- **Mobile Testing**: Appium, Xcode, iOS Simulators
- **Containerization**: Docker, Docker Compose
- **Database**: Redis 7
- **File Handling**: Multer for app uploads

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose installed
- At least 4GB RAM available for containers
- Ports 3000, 3001, 3002, and 6379 available

### 1. Clone the Repository

```bash
git clone <repository-url>
cd mobile-testing-hub
```

### 2. Build and Start Services

```bash
# Build and start all services
docker compose up --build

# Or run in detached mode
docker compose up --build -d
```

### 3. Verify Services

```bash
# Check service status
docker compose ps

# View logs
docker compose logs -f
```

## 📋 API Endpoints

### App Service (Port 3000)
- **Upload App**: `POST /api/upload` - Upload mobile apps
- **Get App**: `GET /api/apps/{appId}` - Retrieve app details
- **Health Check**: `GET /health` - Service health status

### Simulator Service (Port 3001)
- **Create Session**: `POST /simulate` - Boot simulator and install app
- **Health Check**: `GET /health` - Service health status

### Proxy Service (Port 3002)
- **Session Creation**: `POST /wd/hub/session` - Create Appium test sessions
- **WebDriver Commands**: `ANY /wd/hub/session/:sessionId/...` - Execute test commands
- **Health Check**: `GET /health` - Service health status

## 🔧 Configuration

### Environment Variables

You can customize the behavior by setting environment variables:

```bash
# App Service
REDIS_HOST=redis
REDIS_PORT=6379
NODE_ENV=production

# Simulator Service
DEVICE_NAME=iPhone 12
PLATFORM_VERSION=14.4
APP_SERVICE_URL=http://app-service:3000

# Proxy Service
SIMULATOR_SERVICE_URL=http://simulator-service:3001
```

### Docker Compose Override

Create a `docker-compose.override.yml` for development:

```yaml
version: '3.8'
services:
  app-service:
    environment:
      - NODE_ENV=development
    volumes:
      - ./app-service:/usr/src/app
      - /usr/src/app/node_modules
```

## 🧪 Testing the Setup

### 1. Upload a Test App

```bash
curl -X POST http://localhost:3000/api/upload \
  -F "appFile=@/path/to/your/app.ipa"
```

### 2. Create a Test Session

```bash
curl -X POST http://localhost:3002/wd/hub/session \
  -H "Content-Type: application/json" \
  -d '{
    "capabilities": {
      "platformName": "iOS",
      "appId": "your-app-id",
      "deviceName": "iPhone 12",
      "platformVersion": "14.4"
    }
  }'
```

## 📊 Monitoring

### Health Checks

All services include health checks:

```bash
# Check individual service health
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
```

### Logs

```bash
# View all logs
docker compose logs

# View specific service logs
docker compose logs app-service
docker compose logs simulator-service
docker compose logs proxy-service
```

## 🛠️ Development

### Local Development

```bash
# Start only Redis for local development
docker compose up redis -d
```

# Run services locally
cd app-service && npm install && npm start
cd simulator-service && npm install && npm start
cd proxy-service && npm install && npm start
```

### Building Individual Services

```bash
# Build specific service
docker compose build app-service

# Rebuild and restart specific service
docker compose up --build app-service
```

## 🔍 Troubleshooting

### Common Issues

1. **Port Conflicts**: Ensure ports 3000, 3001, 3002, 6379 are available
2. **Memory Issues**: Increase Docker memory allocation to at least 4GB
3. **Network Issues**: Check if containers can communicate via `docker-compose exec app-service ping simulator-service`

### Debug Commands

```bash
# Enter container shell
docker compose exec app-service sh
docker compose exec simulator-service sh
docker compose exec proxy-service sh
```

# Check container resources
docker stats

# View network configuration
docker network ls
docker network inspect mobile-testing-hub_app-network
```

## 📁 Project Structure

```
mobile-testing-hub/
├── app-service/          # App management service
├── simulator-service/    # Simulator management service
├── proxy-service/        # Appium proxy service
├── docker-compose.yml    # Main orchestration file
└── README.md            # This file
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues and questions:
- Create an issue on GitHub
- Check the troubleshooting section above
- Review the service-specific README files in each service directory 