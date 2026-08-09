const { spawn } = require('child_process');
const fs = require('fs');
const net = require('net');
const path = require('path');

const root = __dirname;
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const pidFile = path.join(root, '.start-all-pids.json');

function writePidFile(children) {
  const pids = children.filter(Boolean).map((child) => child.pid).filter(Boolean);
  fs.writeFileSync(pidFile, JSON.stringify(pids, null, 2));
}

function clearPidFile() {
  if (fs.existsSync(pidFile)) {
    fs.unlinkSync(pidFile);
  }
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    socket.once('connect', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', (error) => {
      resolve(error.code === 'ECONNREFUSED' || error.code === 'EHOSTUNREACH');
    });
  });
}

async function getAvailablePort(startPort, maxAttempts = 20) {
  for (let port = startPort; port < startPort + maxAttempts; port += 1) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`Unable to find a free port starting at ${startPort}`);
}

function buildCommandLine(command, args) {
  return [command, ...args]
    .map((value) => {
      const stringValue = String(value);
      return /\s/.test(stringValue) ? `"${stringValue.replace(/"/g, '\\"')}"` : stringValue;
    })
    .join(' ');
}

function startAttached(command, args, cwd, label, extraEnv = {}) {
  const spawnOptions = {
    cwd,
    stdio: 'inherit',
    windowsHide: false,
    env: { ...process.env, ...extraEnv, FORCE_COLOR: 'true' }
  };

  const child = process.platform === 'win32' && command === npmCommand
    ? spawn('cmd.exe', ['/d', '/s', '/c', buildCommandLine(command, args)], spawnOptions)
    : spawn(command, args, spawnOptions);

  child.on('error', (error) => {
    console.error(`${label} failed to start:`, error.message);
  });

  child.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`\n${label} exited with code ${code}`);
    }
  });

  return child;
}

function startNodeScript(scriptPath, cwd, label, extraEnv = {}) {
  return startAttached(process.execPath, [scriptPath], cwd, label, extraEnv);
}

async function main() {
  clearPidFile();

  const backendPort = process.env.BACKEND_PORT ? Number(process.env.BACKEND_PORT) : await getAvailablePort(4000);
  const frontendPort = process.env.FRONTEND_PORT ? Number(process.env.FRONTEND_PORT) : await getAvailablePort(3000);
  const exportPort = process.env.EXPORT_PORT ? Number(process.env.EXPORT_PORT) : await getAvailablePort(5000);

  console.log(`Starting backend, frontend, and export service on ports ${backendPort}, ${frontendPort}, and ${exportPort}...`);

  const backend = startNodeScript(path.join(root, 'backend', 'index.js'), path.join(root, 'backend'), 'Backend', { PORT: String(backendPort) });
  const frontend = startAttached(npmCommand, ['start'], path.join(root, 'frontend'), 'Frontend', {
    PORT: String(frontendPort),
    HOST: 'localhost',
    BROWSER: 'none',
    REACT_APP_API_URL: `http://localhost:${backendPort}`,
    REACT_APP_EXPORT_URL: `http://localhost:${exportPort}`
  });
  const exportService = startNodeScript(path.join(root, 'export', 'index.js'), path.join(root, 'export'), 'Export service', { PORT: String(exportPort) });

  writePidFile([backend, frontend, exportService]);

  const stopAll = () => {
    [backend, frontend, exportService].forEach((child) => {
      if (child && child.pid && !child.killed) {
        try {
          process.kill(child.pid, 'SIGTERM');
        } catch (error) {
          if (error.code !== 'ESRCH') {
            console.warn(`Unable to stop child ${child.pid}:`, error.message);
          }
        }
      }
    });
    clearPidFile();
  };

  process.on('SIGINT', () => {
    stopAll();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    stopAll();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Failed to start services:', error);
  process.exit(1);
});
