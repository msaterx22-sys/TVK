const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

const SERVER_PORT = process.env.PORT || '3000';
const SERVER_URL = `http://127.0.0.1:${SERVER_PORT}`;
const START_PATH = process.env.ELECTRON_START_URL || SERVER_URL;

function startServer() {
  const serverModulePath = path.join(__dirname, 'dist', 'server.cjs');
  if (!fs.existsSync(serverModulePath)) {
    throw new Error(`Server module not found at ${serverModulePath}`);
  }

  try {
    require(serverModulePath);
    console.log(`TVK server module loaded from ${serverModulePath}`);
  } catch (error) {
    console.error('Failed to load TVK server module:', error);
    throw error;
  }
}

function waitForServer(url, timeout = 20000) {
  const deadline = Date.now() + timeout;

  return new Promise((resolve, reject) => {
    const check = () => {
      const request = http.get(url, (res) => {
        res.resume();
        res.on('end', () => resolve());
      });

      request.on('error', (err) => {
        if (Date.now() > deadline) {
          reject(new Error(`Server did not respond within ${timeout}ms: ${err.message}`));
          return;
        }
        setTimeout(check, 250);
      });
    };

    check();
  });
}

function isServerRunning(url, timeout = 1000) {
  return new Promise((resolve) => {
    const request = http.get(url, (res) => {
      res.destroy();
      resolve(true);
    });

    request.on('error', () => resolve(false));
    request.setTimeout(timeout, () => {
      request.destroy();
      resolve(false);
    });
  });
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const serverRunning = await isServerRunning(`${SERVER_URL}/api/health`);
  if (!serverRunning) {
    try {
      startServer();
      await waitForServer(SERVER_URL);
    } catch (error) {
      console.warn('TVK server did not start or did not respond in time:', error);
    }
  } else {
    console.log(`Using existing server at ${SERVER_URL}`);
  }

  win.loadURL(START_PATH);
}

app.whenReady().then(async () => {
  const serverRunning = await isServerRunning(`${SERVER_URL}/api/health`);
  if (!serverRunning) {
    try {
      startServer();
    } catch (error) {
      console.error('Could not start server module:', error);
    }
  } else {
    console.log(`Using existing server at ${SERVER_URL}`);
  }

  await createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
