#!/bin/bash

echo "🐳 Testing Mobile Testing Hub Docker Setup"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a service is healthy
check_health() {
    local service_name=$1
    local port=$2
    local max_attempts=30
    local attempt=1
    
    echo -e "${YELLOW}Checking $service_name health...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:$port/health > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $service_name is healthy!${NC}"
            return 0
        else
            echo -e "${YELLOW}⏳ Attempt $attempt/$max_attempts - $service_name not ready yet...${NC}"
            sleep 2
            ((attempt++))
        fi
    done
    
    echo -e "${RED}❌ $service_name failed to become healthy after $max_attempts attempts${NC}"
    return 1
}

# Function to test API endpoints
test_api() {
    local service_name=$1
    local port=$2
    local endpoint=$3
    local method=${4:-GET}
    
    echo -e "${YELLOW}Testing $service_name $endpoint...${NC}"
    
    if curl -s -X $method http://localhost:$port$endpoint > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $service_name $endpoint is working${NC}"
        return 0
    else
        echo -e "${RED}❌ $service_name $endpoint failed${NC}"
        return 1
    fi
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Check if docker compose is available
if ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ docker compose is not available. Please install Docker Desktop with Compose support.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker and docker compose are available${NC}"

# Build and start services
echo -e "${YELLOW}🚀 Building and starting services...${NC}"
docker compose up --build -d

# Wait for services to start
echo -e "${YELLOW}⏳ Waiting for services to start...${NC}"
sleep 10

# Check service health
echo -e "${YELLOW}🔍 Checking service health...${NC}"

check_health "App Service" 3000
app_healthy=$?

check_health "Simulator Service" 3001
simulator_healthy=$?

check_health "Proxy Service" 3002
proxy_healthy=$?

# Test API endpoints
echo -e "${YELLOW}🧪 Testing API endpoints...${NC}"

if [ $app_healthy -eq 0 ]; then
    test_api "App Service" 3000 "/api/upload" "POST"
fi

if [ $simulator_healthy -eq 0 ]; then
    test_api "Simulator Service" 3001 "/simulate" "POST"
fi

if [ $proxy_healthy -eq 0 ]; then
    test_api "Proxy Service" 3002 "/wd/hub/session" "POST"
fi

# Show service status
echo -e "${YELLOW}📊 Service Status:${NC}"
docker compose ps

# Show logs summary
echo -e "${YELLOW}📋 Recent logs:${NC}"
docker compose logs --tail=10

# Summary
echo -e "${YELLOW}📈 Summary:${NC}"
if [ $app_healthy -eq 0 ] && [ $simulator_healthy -eq 0 ] && [ $proxy_healthy -eq 0 ]; then
    echo -e "${GREEN}🎉 All services are healthy and ready for use!${NC}"
    echo -e "${GREEN}🌐 Access your services at:${NC}"
    echo -e "   App Service: http://localhost:3000"
    echo -e "   Simulator Service: http://localhost:3001"
    echo -e "   Proxy Service: http://localhost:3002"
    echo -e "   Redis: localhost:6379"
else
    echo -e "${RED}⚠️  Some services are not healthy. Check the logs above for details.${NC}"
    echo -e "${YELLOW}💡 Try running: docker-compose logs -f${NC}"
fi

echo -e "${YELLOW}🛑 To stop services: docker compose down${NC}"
echo -e "${YELLOW}🔄 To restart services: docker compose restart${NC}" 