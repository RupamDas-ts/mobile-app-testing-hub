# Mobile App Testing System - Project Concept

## Objective

Create a **Docker-based system** consisting of three services to automate testing of iOS mobile applications using **Appium**, **Xcode**, and **iOS Simulators**. The system should expose APIs for app upload, simulator management, and execution of Appium test sessions through a centralized hub endpoint, similar to how a Selenium/Appium Grid works.

## System Architecture

The system comprises **three modular services**, each encapsulating a distinct responsibility:

### 1. App Management Service (AppService)

**Responsibilities:**

* Handles app uploads and manages metadata.
* Stores uploaded app binaries with a unique `appId`.
* Provides optional metadata retrieval.

**Endpoints:**

* `POST /upload`: Uploads an `.app` or `.ipa` file. Returns `appId` and upload status.
* `GET /apps/{appId}`: (Optional) Retrieves app metadata (e.g., name, version, bundle ID).

### 2. Simulator Management Service (SimulatorService)

**Responsibilities:**

* Boots iOS simulators using Xcode tools based on specified capabilities.
* Installs apps by retrieving them using `appId` from AppService.
* Prepares and starts an Appium server bound to the simulator instance.

**Endpoints:**

* `POST /simulate`: Accepts simulator configuration, `appId`, and desired capabilities. Boots simulator, installs app, and launches Appium server. Returns simulator/Appium session info.
* `POST /simulators/start`: (Optional) Starts a simulator with given device configuration.
* `POST /appium/start`: (Optional) Starts an Appium server on a given simulator.

### 3. Appium Proxy Service (ProxyService)

**Responsibilities:**

* Exposes a **hub endpoint** (`/wd/hub`) just like Selenium/Appium Grid.
* Accepts standard RemoteWebDriver/Appium session creation requests from test clients.
* Forwards session creation requests to the SimulatorService to start simulators and launch Appium servers.
* After a session is created, it proxies all subsequent WebDriver commands to the correct Appium server based on session ID.
* Modifies or augments capabilities (e.g., adding UDID, bundle ID, deviceName) as required.

**Endpoints:**

* `POST /wd/hub`: Main entry point for RemoteWebDriver clients. Accepts session creation (`POST /session`) and command execution (e.g., `/session/:sessionId/element`).
* Internally manages session-to-Appium server mapping to route commands correctly.

**Behavior:**

* On `POST /wd/hub/session`, it:

  * Parses capabilities (including `appId`, `deviceName`, `platformVersion`, etc.).
  * Sends the data to SimulatorService's `/simulate` endpoint.
  * Receives the running Appium server URL and simulator info.
  * Creates the session on the Appium server and returns it to the client.
  * Maintains an internal mapping of `sessionId → Appium server URL`.

* On subsequent commands (e.g., `GET /wd/hub/session/:sessionId/...`), it:

  * Looks up the corresponding Appium server using the session ID.
  * Proxies the request to that Appium server.
  * Returns the response to the client.

## Detailed Workflow

### 1. App Upload

* User uploads an app using `POST /upload`.
* AppService returns a unique `appId` to identify the stored app.

### 2. Session Initialization (ProxyService)

* User/test framework sends a standard RemoteWebDriver session request to `POST /wd/hub/session` with capabilities including `appId`, `deviceName`, `platformVersion`, etc.
* ProxyService forwards the request to SimulatorService's `/simulate` endpoint.
* SimulatorService boots the simulator, installs the app, and launches the Appium server.
* ProxyService forwards the modified capabilities to the running Appium server to initiate the session.
* The response (with `sessionId`) is returned to the client.

### 3. Test Execution

* All further WebDriver commands (e.g., `click`, `findElement`, etc.) are sent to `/wd/hub/session/:sessionId/...` on the ProxyService.
* ProxyService uses its session map to forward requests to the correct Appium server instance and returns responses to the client.

## Key Features

* **Hub-Like Entry Point**: The ProxyService replicates the behavior of an Appium/Selenium Grid by exposing a central `/wd/hub` endpoint.
* **Capability Interception**: ProxyService intercepts and modifies capabilities to add internal configuration like simulator UDID or bundle ID.
* **Session Routing**: Each active session is routed dynamically to its Appium server instance using an internal mapping of `sessionId → Appium endpoint`.
* **Stateless Client Integration**: From the client/test framework's perspective, it's a standard RemoteWebDriver session via `/wd/hub`.

## Tech Stack

* **Node.js** (JavaScript/TypeScript) for API services.
* **Appium** to manage mobile test automation sessions.
* **Xcode + iOS Simulators** for device simulation.
* **Docker** for containerization.
* **Kubernetes** for orchestration and scaling.
* **Local/Cloud Storage** for app binaries.
* **Redis or MongoDB** (optional) for tracking sessions and app metadata.

## Expected Endpoints

### AppService

* `POST /upload`: Upload app binary, return `appId`.
* `GET /apps/{appId}`: Optional retrieval of app metadata.

### SimulatorService

* `POST /simulate`: Boots simulator, installs app, starts Appium.
* `POST /simulators/start`: Starts simulator (optional).
* `POST /appium/start`: Starts Appium server (optional).

### ProxyService

* `POST /wd/hub/session`: Creates WebDriver/Appium session, mimicking a Selenium Grid Hub.
* `ANY /wd/hub/session/:sessionId/...`: Routes and proxies all Appium WebDriver commands to the correct Appium server instance.
