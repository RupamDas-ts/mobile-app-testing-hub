
# AppService - Mobile App Management Service

This is the backend service that handles uploading and managing mobile apps. The service provides APIs for uploading apps and retrieving app details. It uses **Redis** to store app data.

## Features

- **Upload Mobile App**: Allows users to upload a mobile app and store it in Redis.
- **Fetch App Details**: Retrieve details of a stored app, including name, size, type, and the base64 encoded file data.

## Tech Stack

- **Node.js**: Backend API service.
- **Express.js**: Web framework for building the RESTful API.
- **Multer**: Middleware for handling file uploads.
- **Redis**: Database for storing app data (name, size, content type, etc.).
- **dotenv**: Environment variable management.
- **Docker**: For containerizing the service.

## API Endpoints

### 1. **Upload App**
- **Endpoint**: `POST /api/upload`
- **Description**: Uploads a mobile app and stores it in Redis.
- **Request Body**:
  - Form-data with the key `appFile` to upload the app file.
- **Response**:
  ```json
  {
    "message": "App uploaded successfully",
    "appId": "unique-app-id"
  }
  ```
  - **appId**: Unique identifier for the uploaded app.

### 2. **Get App Details**
- **Endpoint**: `GET /api/apps/{appId}`
- **Description**: Retrieves details of a stored app.
- **Parameters**:
  - `appId`: The ID of the app to fetch details for.
- **Response**:
  ```json
  {
    "id": "unique-app-id",
    "name": "app-name.ipa",
    "size": 1234567,
    "contentType": "application/octet-stream",
    "data": "base64-encoded-file-data"
  }
  ```

## Prerequisites

- **Node.js**: Version 16 or higher.
- **Redis**: A Redis server running on `localhost:6379` (or configure the connection URL in the `.env` file).
- **Docker**: Optional, for containerizing the application.

## Installation

### 1. **Clone the Repository**
Clone the project to your local machine:
```bash
git clone https://github.com/your-username/app-service.git
cd app-service
```

### 2. **Install Dependencies**
Install the required dependencies:
```bash
npm install
```

### 3. **Set Up Environment Variables**
Create a `.env` file in the root directory with the following content:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
PORT=3000
```

If you're running Redis on a different host or port, update `REDIS_HOST` and `REDIS_PORT` accordingly.

### 4. **Start the Redis Server**
Make sure Redis is running. If you're using Docker, you can run Redis in a container:

```bash
docker run --name redis-container -d -p 6379:6379 redis
```

### 5. **Start the AppService**
Start the server:
```bash
node server.js
```

The server will be running on `http://localhost:3000`.

## Using the API

### Upload an App

Use **Postman** or **cURL** to send a `POST` request to `http://localhost:3000/api/upload` with the app file in the form-data.

**cURL Example**:
```bash
curl -X POST http://localhost:3000/api/upload   -F "appFile=@/path/to/your/app/file.ipa"
```

### Get App Details

To fetch details of an uploaded app, send a `GET` request to `http://localhost:3000/api/apps/{appId}`.

**cURL Example**:
```bash
curl -X GET http://localhost:3000/api/apps/{appId}
```

Replace `{appId}` with the actual app ID returned when the app was uploaded.

## Docker Support

If you want to run the service using Docker, you can use the following Docker setup.

### 1. **Create a `Dockerfile`**

```Dockerfile
# Use official Node.js image as the base image
FROM node:16

# Set working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the app's code
COPY . .

# Expose port 3000
EXPOSE 3000

# Start the app
CMD ["node", "server.js"]
```

### 2. **Create a `docker-compose.yml`**

```yaml
version: '3'
services:
  app-service:
    build: .
    ports:
      - "3000:3000"
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=your_redis_password
    depends_on:
      - redis
  redis:
    image: redis
    ports:
      - "6379:6379"
```

### 3. **Build and Run the Containers**

```bash
docker-compose up --build
```

This will start both the **AppService** and the **Redis** service in Docker containers. The app will be accessible at `http://localhost:3000`.

## Troubleshooting

- If you're seeing Redis connection errors, ensure that Redis is running and the credentials in the `.env` file are correct.
- If you encounter errors with the API endpoints, check the server logs for more information.

## License

MIT License. See the [LICENSE](LICENSE) file for more information.
