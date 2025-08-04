const { exec } = require('child_process');
const util = require('util');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

// Promisify exec for better async/await usage
const execAsync = util.promisify(exec);

// Function to fetch app from AppService API using appId
const getAppFromAppService = async (appId) => {
    try {
        const appServiceUrl = process.env.APP_SERVICE_URL || 'http://localhost:3000';
        const response = await axios.get(`${appServiceUrl}/api/apps/${appId}`);
        console.log("Fetched app from AppService: ", response.data);
        return response.data.app;
    } catch (error) {
        console.error(`Error fetching app from AppService for appId ${appId}: ${error.message}`);
        throw new Error('Error fetching app from AppService: ' + error.message);
    }
};

// Function to execute commands on macOS host system
const executeOnHost = async (command) => {
    console.log(`Executing command on macOS: ${command}`);
    const { stdout, stderr } = await execAsync(command);
    if (stderr) {
        console.warn(`Command stderr: ${stderr}`);
    }
    return stdout;
};

// Function to get simulator UDID by device name
const getSimulatorUDID = async (deviceName) => {
    try {
        const command = `xcrun simctl list devices -j | jq -r '.devices | to_entries[] | .value[] | select(.name == "${deviceName}") | .udid' | head -1`;
        const stdout = await executeOnHost(command);

        const udid = stdout.trim();
        if (!udid) {
            throw new Error(`No UDID found for device: ${deviceName}`);
        }
        return udid;
    } catch (error) {
        console.error(`Error getting UDID for device ${deviceName}: ${error.message}`);
        throw new Error(`Failed to get UDID for device: ${error.message}`);
    }
};

// Function to check if the simulator is already booted
const isSimulatorBooted = async (deviceName) => {
    try {
        const udid = await getSimulatorUDID(deviceName);
        const command = `xcrun simctl list devices | grep "${udid}"`;
        const stdout = await executeOnHost(command);
        return stdout.includes('(Booted)');
    } catch (error) {
        if (error.message.includes('No UDID found') || error.message.includes('command failed')) {
            return false;
        }
        throw error;
    }
};

// Function to open Simulator app window
const openSimulatorWindow = async (deviceName) => {
    try {
        const udid = await getSimulatorUDID(deviceName);
        // Open Simulator app and focus on the specific device
        await executeOnHost(`open -a Simulator`);

        // Give Simulator app a moment to start
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Boot the specific device if not already booted
        const isBooted = await isSimulatorBooted(deviceName);
        if (!isBooted) {
            await executeOnHost(`xcrun simctl boot ${udid}`);
        }

        console.log(`Simulator window opened for ${deviceName} (${udid})`);
    } catch (error) {
        console.error(`Error opening Simulator window: ${error.message}`);
        throw new Error('Failed to open Simulator window: ' + error.message);
    }
};

// Function to start simulator using UDID
const startSimulator = async (deviceName) => {
    try {
        const isBooted = await isSimulatorBooted(deviceName);
        if (isBooted) {
            console.log(`Simulator ${deviceName} is already booted.`);
            // Still open the Simulator window even if already booted
            await openSimulatorWindow(deviceName);
            return;
        }

        const udid = await getSimulatorUDID(deviceName);
        await executeOnHost(`xcrun simctl boot ${udid}`);
        console.log(`Simulator ${deviceName} (${udid}) booted successfully`);

        // Open the Simulator window
        await openSimulatorWindow(deviceName);
    } catch (error) {
        console.error(`Error in startSimulator: ${error.message}`);
        throw new Error('Failed to boot simulator: ' + error.message);
    }
};

// Function to process base64 zip file and extract .app path
const processAppZip = async (appBase64) => {
    let tempDir;
    try {
        // 1. Create temp directory
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'app-process-'));
        const appFilePath = path.join(tempDir, 'app.zip');

        // 2. Write base64 to file
        fs.writeFileSync(appFilePath, Buffer.from(appBase64, 'base64'));

        // 3. Extract the app (assuming it's a zip file)
        const extractDir = path.join(tempDir, 'extracted');
        fs.mkdirSync(extractDir);

        // Use unzip to extract the app
        await execAsync(`unzip -q "${appFilePath}" -d "${extractDir}"`);

        // Recursive function to find .app directory
        const findAppDirectory = (dir) => {
            const items = fs.readdirSync(dir);

            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory()) {
                    if (item.endsWith('.app')) {
                        return fullPath;
                    }
                    // Recursively search subdirectories
                    const found = findAppDirectory(fullPath);
                    if (found) {
                        return found;
                    }
                }
            }
            return null;
        };

        // Find the .app directory recursively
        const appPath = findAppDirectory(extractDir);

        if (!appPath) {
            throw new Error('No .app directory found in extracted files');
        }

        console.log(`Found .app directory at: ${appPath}`);
        return appPath;
    } catch (error) {
        console.error(`Error processing app zip: ${error.message}`);
        throw new Error(`Error processing app zip: ${error.message}`);
    }
};

// Function to install the app using `xcrun simctl install` with app path
const installAppOnSimulator = async (appPath, deviceName) => {
    try {
        // Install the app using the extracted .app path
        const udid = await getSimulatorUDID(deviceName);
        console.log(`Installing app on simulator ${deviceName} with UDID ${udid} with command: xcrun simctl install ${udid} "${appPath}"`);
        const stdout = await executeOnHost(`xcrun simctl install ${udid} "${appPath}"`);

        console.log(`App installed successfully on ${deviceName}: ${stdout}`);
        return stdout;
    } catch (error) {
        console.error(`Error installing app: ${error.message}`);
        throw new Error(`Error installing app: ${error.message}`);
    }
};

// Function to get the app's bundleId
const getAppBundleId = async (appPath) => {
    try {
        const stdout = await executeOnHost(
            `/usr/libexec/PlistBuddy -c "Print CFBundleIdentifier" "${appPath}/Info.plist"`
        );
        const bundleId = stdout.trim();
        console.log(`Bundle ID fetched: ${bundleId}`);
        return bundleId;
    } catch (error) {
        console.error(`Error getting bundleId for app at path ${appPath}: ${error.message}`);
        throw new Error(`Error getting bundleId: ${error.message}`);
    }
};

// Function to check if any simulators are running
const areSimulatorsRunning = async () => {
    try {
        const stdout = await executeOnHost('xcrun simctl list devices | grep -E "(Booted)"');
        return stdout.trim().length > 0;
    } catch (error) {
        // grep returns error when no matches found, which we treat as no simulators running
        if (error.code === 1) {
            return false;
        }
        console.error(`Error checking simulators: ${error.message}`);
        throw new Error('Error checking simulators.');
    }
};

// Function to check if Xcode is running
const isXcodeRunning = async () => {
    try {
        await executeOnHost('pgrep -x Xcode');
        return true;
    } catch (error) {
        return false;
    }
};

// Function to check if Appium is running
const isAppiumRunning = async () => {
    try {
        // Check if port 4723 is in use
        const stdout = await executeOnHost('lsof -i :4723');
        const portInUse = stdout.trim().length > 0;

        if (!portInUse) {
            console.log('Appium check - Port 4723 is not in use');
            return false;
        }

        // If port is in use, verify it's actually Appium by checking the process
        console.log('Port 4723 is in use, checking if it\'s Appium...');

        // Get the PID of the process using port 4723
        const pidOutput = await executeOnHost('lsof -ti :4723');
        const pid = pidOutput.trim();

        if (!pid) {
            console.log('Appium check - Could not get PID for port 4723');
            return false;
        }

        // Check if the process with this PID is actually Appium
        const processInfo = await executeOnHost(`ps -p ${pid} -o command=`);
        const isAppiumProcess = processInfo.includes('appium');

        console.log(`Appium check - Process on port 4723: ${processInfo.trim()}`);
        console.log(`Appium check - Is Appium process: ${isAppiumProcess}`);

        return isAppiumProcess;

    } catch (error) {
        // If lsof returns error code 1, it means no process is using the port
        if (error.code === 1) {
            console.log('Appium check - Port 4723 is not in use');
            return false;
        }
        console.error(`Error checking Appium: ${error.message}`);
        return false;
    }
};

// Function to start Appium (if not running)
const startAppium = async () => {
    try {
        const isRunning = await isAppiumRunning();
        if (isRunning) {
            console.log('Appium is already running.');
            return;
        }

        console.log('Starting Appium...');

        // Create logs directory if it doesn't exist
        const logsDir = path.join(__dirname, '..', 'logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }

        // Create log file with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const logFile = path.join(logsDir, `appium-${timestamp}.log`);

        // Start Appium using executeOnHost to ensure it runs on macOS
        const appiumCommand = `appium --log ${logFile} --log-level info --local-timezone`;
        await executeOnHost(appiumCommand);

        // Give Appium a moment to start up
        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log('Appium started successfully in background');
        return 'Appium started';
    } catch (error) {
        console.error(`Error starting Appium: ${error.message}`);
        throw new Error(`Error starting Appium: ${error.message}`);
    }
};

// Function to shutdown all simulators
const shutdownAllSimulators = async () => {
    try {
        const stdout = await executeOnHost('xcrun simctl shutdown all');
        console.log(`Simulators shut down successfully: ${stdout}`);
        return stdout;
    } catch (error) {
        // Sometimes shutdown returns error even when successful
        if (error.message.includes("No devices are booted")) {
            console.log('No booted devices to shutdown');
            return "No booted devices to shutdown";
        }
        console.error(`Error shutting down simulators: ${error.message}`);
        throw new Error(`Error shutting down simulators: ${error.message}`);
    }
};

// Function to stop Xcode (if running)
const stopXcode = async () => {
    try {
        const stdout = await executeOnHost('pkill Xcode');
        console.log(`Xcode stopped successfully: ${stdout}`);
        return stdout;
    } catch (error) {
        console.error(`Error stopping Xcode: ${error.message}`);
        throw new Error(`Error stopping Xcode: ${error.message}`);
    }
};

// Function to stop Appium (if running)
const stopAppium = async () => {
    try {
        // Use pkill with pattern matching instead of exact name
        const stdout = await executeOnHost('pkill -f appium');
        console.log(`Appium stopped successfully: ${stdout}`);
        return stdout;
    } catch (error) {
        // If no processes found, pkill will return error code 1
        if (error.code === 1) {
            console.log('No Appium processes found to stop.');
            return 'No Appium processes found';
        }
        console.error(`Error stopping Appium: ${error.message}`);
        throw new Error(`Error stopping Appium: ${error.message}`);
    }
};

// Main controller to start simulator, install app, and return UDID and bundleId
exports.setupSimulatorAndApp = async (req, res) => {
    const { deviceName, platformVersion, appId } = req.body;

    try {
        console.log(`Request received to start simulator for device: ${deviceName}, platform: ${platformVersion}, appId: ${appId}`);

        // Step 1: Fetch app details from AppService using the provided appId
        const app = await getAppFromAppService(appId);

        // Step 2: Start Appium if not already running
        await startAppium();

        // Step 3: Start the simulator
        await startSimulator(deviceName);

        // Step 4: Get the UDID of the simulator
        const udid = await getSimulatorUDID(deviceName);

        // Step 5: Process the app zip and get the .app path
        const appPath = await processAppZip(app.data);

        // Step 6: Install the app on the simulator
        await installAppOnSimulator(appPath, deviceName);

        // Step 7: Get the bundleId of the app
        const bundleId = await getAppBundleId(appPath);

        // Step 8: Launch the app on the simulator
        console.log(`Launching app ${bundleId} on simulator ${deviceName}...`);
        await executeOnHost(`xcrun simctl launch ${udid} ${bundleId}`);
        console.log(`App launched successfully on ${deviceName}`);

        console.log(`Simulator setup successful for device: ${deviceName}, UDID: ${udid}, Bundle ID: ${bundleId}`);

        // Step 9: Return the UDID and bundleId to ProxyService
        res.status(200).json({
            udid: udid,
            bundleId: bundleId
        });

    } catch (error) {
        console.error(`Error during simulator setup: ${error.message}`);
        res.status(500).json({
            message: `Error during simulator setup: ${error.message}`,
            error: error.stack
        });
    }
};

// Cleanup endpoint to shutdown simulators, Xcode, and Appium if they are running
exports.cleanup = async (req, res) => {
    try {
        console.log("Cleanup initiated...");

        // Check if simulators are running
        const simulatorsRunning = await areSimulatorsRunning();
        if (simulatorsRunning) {
            await shutdownAllSimulators();
        } else {
            console.log("No simulators running. Skipping simulator shutdown.");
        }

        // Check if Xcode is running
        const xcodeRunning = await isXcodeRunning();
        if (xcodeRunning) {
            await stopXcode();
        } else {
            console.log("Xcode is not running. Skipping Xcode shutdown.");
        }

        // Check if Appium is running
        const appiumRunning = await isAppiumRunning();
        if (appiumRunning) {
            await stopAppium();
        } else {
            console.log("Appium is not running. Skipping Appium shutdown.");
        }

        console.log("Cleanup completed successfully.");
        res.status(200).json({ message: "Cleanup successful: Simulators, Xcode, and Appium have been stopped if they were running." });

    } catch (error) {
        console.error(`Error during cleanup: ${error.message}`);
        res.status(500).json({
            message: `Error during cleanup: ${error.message}`,
            error: error.stack
        });
    }
};

// Endpoint to open simulator window
exports.openSimulatorWindow = async (req, res) => {
    const { deviceName } = req.body;

    try {
        if (!deviceName) {
            return res.status(400).json({ message: 'deviceName is required' });
        }

        console.log(`Opening simulator window for device: ${deviceName}`);
        await openSimulatorWindow(deviceName);

        res.status(200).json({
            message: `Simulator window opened successfully for ${deviceName}`
        });

    } catch (error) {
        console.error(`Error opening simulator window: ${error.message}`);
        res.status(500).json({
            message: `Error opening simulator window: ${error.message}`,
            error: error.stack
        });
    }
};

// Endpoint to get Appium logs
exports.getAppiumLogs = async (req, res) => {
    try {
        const logsDir = path.join(__dirname, '..', 'logs');

        if (!fs.existsSync(logsDir)) {
            return res.status(404).json({ message: 'No logs directory found' });
        }

        // Get the most recent Appium log file
        const logFiles = fs.readdirSync(logsDir)
            .filter(file => file.startsWith('appium-') && file.endsWith('.log'))
            .sort()
            .reverse();

        if (logFiles.length === 0) {
            return res.status(404).json({ message: 'No Appium log files found' });
        }

        const latestLogFile = path.join(logsDir, logFiles[0]);
        const logContent = fs.readFileSync(latestLogFile, 'utf8');

        // Get last 100 lines by default, or specified number
        const lines = req.query.lines ? parseInt(req.query.lines) : 100;
        const logLines = logContent.split('\n').slice(-lines).join('\n');

        res.status(200).json({
            logFile: logFiles[0],
            lines: logLines,
            totalLines: logContent.split('\n').length
        });

    } catch (error) {
        console.error(`Error reading Appium logs: ${error.message}`);
        res.status(500).json({
            message: `Error reading Appium logs: ${error.message}`,
            error: error.stack
        });
    }
};