# Use macOS image (Xcode and iOS simulators are macOS-exclusive)
FROM macos:latest

# Install necessary dependencies
RUN xcode-select --install && \
    brew install node && \
    npm install -g appium

# Install necessary Xcode command line tools for simulator management
RUN xcode-select --install

# Set working directory in container
WORKDIR /usr/src/app

# Copy the app-service code into the container
COPY . .

# Expose port for Appium (4723 by default)
EXPOSE 4723

# Start Appium server and simulator management service
CMD ["node", "server.js"]