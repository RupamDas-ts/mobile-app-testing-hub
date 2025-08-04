#!/bin/bash

# Mobile Testing Hub Management Script
# This script manages the mobile testing hub services with various flags

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Service configurations
SERVICES=("app-service" "proxy-service" "redis" "simulator-service")
DOCKER_SERVICES=("app-service" "proxy-service" "redis")
LOCAL_SERVICES=("simulator-service")
PORTS=(3000 3001 3002 6379 4723)

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}[$(date '+%Y-%m-%d %H:%M:%S')] ${message}${NC}"
}

# Function to show help
show_help() {
    echo -e "${BLUE}Mobile Testing Hub Management Script${NC}"
    echo ""
    echo "Usage: $0 [FLAGS]"
    echo ""
    echo "Flags:"
    echo "  --setup                    Install all required applications (Docker, Xcode, Appium)"
    echo "  --start                    Start all services locally"
    echo "  --start --setup docker     Start services in Docker containers (except simulator-service)"
    echo "  --start --service <NAME>   Start specific service only"
    echo "  --health                   Check health of all services"
    echo "  --health --service <NAME>  Check health of specific service"
    echo "  --stop                     Stop all running services"
    echo "  --stop --service <NAME>    Stop specific service only"
    echo "  --help                     Show this help message"
    echo ""
    echo "Available Services:"
    for service in "${SERVICES[@]}"; do
        echo "  - $service"
    done
    echo ""
    echo "Examples:"
    echo "  $0 --setup"
    echo "  $0 --start"
    echo "  $0 --start --setup docker"
    echo "  $0 --start --service app-service"
    echo "  $0 --health"
    echo "  $0 --stop"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is free
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 1  # Port is in use
    else
        return 0  # Port is free
    fi
}

# Function to free a port
free_port() {
    local port=$1
    print_status $YELLOW "Port $port is in use. Attempting to free it..."
    
    local pids=$(lsof -ti :$port 2>/dev/null)
    if [ -n "$pids" ]; then
        for pid in $pids; do
            print_status $YELLOW "Killing process $pid using port $port"
            kill -9 $pid 2>/dev/null || true
        done
        sleep 2
        if check_port $port; then
            print_status $GREEN "Port $port is now free"
        else
            print_status $RED "Failed to free port $port"
            return 1
        fi
    fi
}

# Function to check and install Docker
check_docker() {
    if command_exists docker; then
        print_status $GREEN "Docker is already installed"
        if docker --version >/dev/null 2>&1; then
            print_status $GREEN "Docker is running"
        else
            print_status $RED "Docker is installed but not running. Please start Docker Desktop."
            exit 1
        fi
    else
        print_status $YELLOW "Docker is not installed. Installing Docker..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            print_status $YELLOW "Please install Docker Desktop for macOS from https://www.docker.com/products/docker-desktop"
            print_status $YELLOW "After installation, start Docker Desktop and run this script again."
            exit 1
        else
            print_status $RED "Docker installation not supported on this OS. Please install Docker manually."
            exit 1
        fi
    fi
}

# Function to check and install Xcode
check_xcode() {
    if command_exists xcrun; then
        print_status $GREEN "Xcode is already installed"
        if xcode-select -p >/dev/null 2>&1; then
            print_status $GREEN "Xcode command line tools are properly configured"
        else
            print_status $YELLOW "Installing Xcode command line tools..."
            xcode-select --install
        fi
    else
        print_status $RED "Xcode is not installed. Please install Xcode from the App Store."
        exit 1
    fi
}

# Function to check and install Node.js
check_nodejs() {
    if command_exists node; then
        local version=$(node --version)
        print_status $GREEN "Node.js is already installed: $version"
    else
        print_status $YELLOW "Node.js is not installed. Installing Node.js..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS - install via Homebrew
            if command_exists brew; then
                brew install node
            else
                print_status $RED "Homebrew is not installed. Please install Homebrew first: https://brew.sh"
                exit 1
            fi
        else
            print_status $RED "Node.js installation not supported on this OS. Please install Node.js manually."
            exit 1
        fi
    fi
}

# Function to check and install Appium
check_appium() {
    if command_exists appium; then
        print_status $GREEN "Appium is already installed"
    else
        print_status $YELLOW "Appium is not installed. Installing Appium..."
        npm install -g appium@latest
        print_status $GREEN "Appium installed successfully"
    fi
}

# Function to check and install Homebrew (macOS)
check_homebrew() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if command_exists brew; then
            print_status $GREEN "Homebrew is already installed"
        else
            print_status $YELLOW "Installing Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            print_status $GREEN "Homebrew installed successfully"
        fi
    fi
}

# Function to setup all requirements
setup() {
    print_status $BLUE "Setting up Mobile Testing Hub requirements..."
    
    # Check OS
    if [[ "$OSTYPE" != "darwin"* ]]; then
        print_status $RED "This script is designed for macOS. iOS simulators require macOS."
        exit 1
    fi
    
    # Check and install Homebrew
    check_homebrew
    
    # Check and install Node.js
    check_nodejs
    
    # Check and install Docker
    check_docker
    
    # Check and install Xcode
    check_xcode
    
    # Check and install Appium
    check_appium
    
    # Check ports
    print_status $BLUE "Checking if required ports are free..."
    for port in "${PORTS[@]}"; do
        if check_port $port; then
            print_status $GREEN "Port $port is free"
        else
            print_status $YELLOW "Port $port is in use"
            free_port $port
        fi
    done
    
    print_status $GREEN "Setup completed successfully!"
}

# Function to start a service locally
start_service_local() {
    local service=$1
    case $service in
        "app-service")
            print_status $BLUE "Starting app-service locally..."
            cd app-service
            npm install
            npm start &
            cd ..
            ;;
        "proxy-service")
            print_status $BLUE "Starting proxy-service locally..."
            cd proxy-service
            npm install
            npm start &
            cd ..
            ;;
        "redis")
            print_status $BLUE "Starting Redis locally..."
            redis-server --daemonize yes
            ;;
        "simulator-service")
            print_status $BLUE "Starting simulator-service locally..."
            cd simulator-service
            npm install
            npm start &
            cd ..
            ;;
        *)
            print_status $RED "Unknown service: $service"
            print_status $YELLOW "Available services: ${SERVICES[*]}"
            exit 1
            ;;
    esac
}

# Function to start a service in Docker
start_service_docker() {
    local service=$1
    if [[ " ${DOCKER_SERVICES[@]} " =~ " ${service} " ]]; then
        print_status $BLUE "Starting $service in Docker..."
        docker compose up -d $service
    else
        print_status $YELLOW "Service $service cannot run in Docker. Starting locally..."
        start_service_local $service
    fi
}

# Function to start all services
start_all() {
    local use_docker=$1
    
    if [ "$use_docker" = "true" ]; then
        print_status $BLUE "Starting services in Docker containers..."
        docker compose up -d
        
        print_status $YELLOW "Starting simulator-service locally (cannot run in Docker)..."
        start_service_local "simulator-service"
    else
        print_status $BLUE "Starting all services locally..."
        for service in "${SERVICES[@]}"; do
            start_service_local $service
        done
    fi
    
    print_status $GREEN "All services started!"
}

# Function to check service health
check_service_health() {
    local service=$1
    case $service in
        "app-service")
            if curl -s http://localhost:3000/api/health >/dev/null 2>&1; then
                print_status $GREEN "app-service: Healthy"
            else
                print_status $RED "app-service: Unhealthy"
            fi
            ;;
        "proxy-service")
            if curl -s http://localhost:3002/api/health >/dev/null 2>&1; then
                print_status $GREEN "proxy-service: Healthy"
            else
                print_status $RED "proxy-service: Unhealthy"
            fi
            ;;
        "redis")
            if redis-cli ping >/dev/null 2>&1; then
                print_status $GREEN "redis: Healthy"
            else
                print_status $RED "redis: Unhealthy"
            fi
            ;;
        "simulator-service")
            if curl -s http://localhost:3001/api/health >/dev/null 2>&1; then
                print_status $GREEN "simulator-service: Healthy"
            else
                print_status $RED "simulator-service: Unhealthy"
            fi
            ;;
        *)
            print_status $RED "Unknown service: $service"
            print_status $YELLOW "Available services: ${SERVICES[*]}"
            exit 1
            ;;
    esac
}

# Function to check all services health
check_all_health() {
    print_status $BLUE "Checking health of all services..."
    for service in "${SERVICES[@]}"; do
        check_service_health $service
    done
}

# Function to stop a service
stop_service() {
    local service=$1
    case $service in
        "app-service"|"proxy-service")
            print_status $BLUE "Stopping $service..."
            pkill -f "node.*$service" || true
            ;;
        "redis")
            print_status $BLUE "Stopping Redis..."
            redis-cli shutdown || true
            ;;
        "simulator-service")
            print_status $BLUE "Stopping simulator-service..."
            pkill -f "node.*simulator-service" || true
            ;;
        *)
            print_status $RED "Unknown service: $service"
            print_status $YELLOW "Available services: ${SERVICES[*]}"
            exit 1
            ;;
    esac
}

# Function to stop all services
stop_all() {
    print_status $BLUE "Stopping all services..."
    
    # Stop Docker services
    docker compose down 2>/dev/null || true
    
    # Stop local services
    for service in "${SERVICES[@]}"; do
        stop_service $service
    done
    
    print_status $GREEN "All services stopped!"
}

# Main script logic
main() {
    local setup_flag=false
    local start_flag=false
    local health_flag=false
    local stop_flag=false
    local docker_flag=false
    local service_name=""
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --setup)
                setup_flag=true
                shift
                ;;
            --start)
                start_flag=true
                shift
                ;;
            --health)
                health_flag=true
                shift
                ;;
            --stop)
                stop_flag=true
                shift
                ;;
            --service)
                if [[ -z "$2" ]]; then
                    print_status $RED "Error: --service requires a service name"
                    show_help
                    exit 1
                fi
                service_name="$2"
                shift 2
                ;;
            docker)
                docker_flag=true
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                print_status $RED "Unknown flag: $1"
                print_status $YELLOW "Use --help to see all available flags"
                exit 1
                ;;
        esac
    done
    
    # Execute based on flags
    if [ "$setup_flag" = true ]; then
        setup
    fi
    
    if [ "$start_flag" = true ]; then
        if [ -n "$service_name" ]; then
            if [ "$docker_flag" = true ]; then
                start_service_docker "$service_name"
            else
                start_service_local "$service_name"
            fi
        else
            start_all "$docker_flag"
        fi
    fi
    
    if [ "$health_flag" = true ]; then
        if [ -n "$service_name" ]; then
            check_service_health "$service_name"
        else
            check_all_health
        fi
    fi
    
    if [ "$stop_flag" = true ]; then
        if [ -n "$service_name" ]; then
            stop_service "$service_name"
        else
            stop_all
        fi
    fi
    
    # If no flags provided, show help
    if [ "$setup_flag" = false ] && [ "$start_flag" = false ] && [ "$health_flag" = false ] && [ "$stop_flag" = false ]; then
        show_help
    fi
}

# Run main function with all arguments
main "$@" 