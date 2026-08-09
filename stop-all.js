const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const pidFile = path.join(__dirname, '.start-all-pids.json');

function stopPid(pid) {
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
    } else {
      process.kill(pid, 'SIGTERM');
    }
  } catch (error) {
    if (error.code !== 'ESRCH') {
      console.warn(`Unable to stop process ${pid}:`, error.message);
    }
  }
}

console.log('Stopping backend, frontend, and export service...');

if (fs.existsSync(pidFile)) {
  const pids = JSON.parse(fs.readFileSync(pidFile, 'utf8'));
  pids.forEach(stopPid);
  fs.unlinkSync(pidFile);
} else {
  console.log('No tracked processes found.');
}
