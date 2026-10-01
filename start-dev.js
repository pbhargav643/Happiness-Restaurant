import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

console.log(`${BOLD}${YELLOW}================================================================${RESET}`);
console.log(`${BOLD}${YELLOW}  HAPPINESS RESTAURANT - STARTING FULL-STACK ENVIRONMENT${RESET}`);
console.log(`${BOLD}${YELLOW}================================================================${RESET}`);
console.log(`  ${CYAN}[BACKEND]${RESET}  Node.js API  -> http://localhost:5000`);
console.log(`  ${GREEN}[FRONTEND]${RESET} React App    -> http://localhost:3000`);
console.log(`${BOLD}${YELLOW}================================================================${RESET}\n`);

const backendDir = path.join(__dirname, 'backend');
const frontendDir = path.join(__dirname, 'frontend');

// Spawn Backend Server
const backend = spawn('npm', ['run', 'dev'], {
  cwd: backendDir,
  shell: true,
  stdio: ['inherit', 'pipe', 'pipe'],
});

backend.stdout.on('data', (data) => {
  const lines = data.toString().split('\n');
  lines.forEach((line) => {
    if (line.trim()) {
      console.log(`${CYAN}[BACKEND]${RESET} ${line}`);
    }
  });
});

backend.stderr.on('data', (data) => {
  const lines = data.toString().split('\n');
  lines.forEach((line) => {
    if (line.trim()) {
      console.error(`${RED}[BACKEND ERR]${RESET} ${line}`);
    }
  });
});

backend.on('close', (code) => {
  console.log(`${YELLOW}[BACKEND] Process exited with code ${code}${RESET}`);
});

// Spawn Frontend Server
const frontend = spawn('npm', ['run', 'dev'], {
  cwd: frontendDir,
  shell: true,
  stdio: ['inherit', 'pipe', 'pipe'],
});

frontend.stdout.on('data', (data) => {
  const lines = data.toString().split('\n');
  lines.forEach((line) => {
    if (line.trim()) {
      console.log(`${GREEN}[FRONTEND]${RESET} ${line}`);
    }
  });
});

frontend.stderr.on('data', (data) => {
  const lines = data.toString().split('\n');
  lines.forEach((line) => {
    if (line.trim()) {
      console.error(`${RED}[FRONTEND ERR]${RESET} ${line}`);
    }
  });
});

frontend.on('close', (code) => {
  console.log(`${YELLOW}[FRONTEND] Process exited with code ${code}${RESET}`);
});

// Clean shutdown on Ctrl+C or kill
function cleanup() {
  console.log(`\n${BOLD}${YELLOW}[SHUTDOWN] Stopping all servers...${RESET}`);
  try {
    if (backend && !backend.killed) {
      backend.kill('SIGINT');
    }
  } catch {}
  try {
    if (frontend && !frontend.killed) {
      frontend.kill('SIGINT');
    }
  } catch {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
