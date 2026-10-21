import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile, readFile, rm, readdir } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPaths, assertSafeDirectory, validateCompose } from './e2e-safety.mjs';

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.dirname(frontend);
const args = process.argv.slice(2);
let activeChild;
let interrupted = false;
let cleaning = false;
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    interrupted = true;
    if (!cleaning) activeChild?.kill('SIGTERM');
  });
}

async function command(executable, argv, options = {}) {
  if (interrupted && !cleaning) throw new Error('E2E interrupted');
  return new Promise((resolve, reject) => {
    const child = spawn(executable, argv, {
      cwd: root,
      env: process.env,
      windowsHide: true,
      stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
      ...options,
    });
    activeChild = child;
    let output = '';
    let errors = '';
    child.stdout?.on('data', (data) => (output += data));
    child.stderr?.on('data', (data) => (errors += data));
    child.on('error', reject);
    child.on('close', (code) => {
      if (activeChild === child) activeChild = undefined;
      if (code === 0) resolve(output);
      else reject(new Error(`${executable} exited with ${code ?? 'signal'}${errors ? `: ${errors}` : ''}`));
    });
  });
}

function portAvailable(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', () => reject(new Error(`E2E port ${port} is occupied; choose E2E_PORT.`)));
    server.listen(port, '127.0.0.1', () => server.close(resolve));
  });
}

function environment(id, port) {
  const locations = runPaths(root, id);
  const env = { ...process.env, SECRETS_DIR: locations.secrets, E2E_PORT: String(port) };
  // Prevent inherited Compose settings from selecting unrelated files or projects.
  delete env.COMPOSE_FILE;
  delete env.COMPOSE_PROJECT_NAME;
  const compose = ['compose', '--project-name', id, '-f', 'docker-compose.yml', '-f', 'docker-compose.e2e.yml'];
  return { ...locations, env, compose };
}

async function cleanup(id, port) {
  const run = environment(id, port);
  await assertSafeDirectory(root, run.secrets);
  // Read the marker before any destructive operation; no global Docker cleanup.
  const marker = JSON.parse(await readFile(path.join(run.directory, 'run.json'), 'utf8'));
  if (marker.id !== id || marker.port !== port) throw new Error('Invalid E2E cleanup marker');
  await command('docker', [...run.compose, 'down', '--volumes', '--remove-orphans', '--timeout', '10'], { env: run.env });
  await rm(run.secrets, { recursive: true, force: true });
  await writeFile(path.join(run.directory, 'cleaned'), 'ok\n');
}

async function main() {
  if (args[0] === 'cleanup') {
    const ids = args[1] === '--all'
      ? await readdir(path.join(root, 'artifacts', 'e2e')).catch((error) => {
          if (error.code === 'ENOENT') return [];
          throw error;
        })
      : [args[1]];
    for (const id of ids) {
      const run = runPaths(root, id);
      await assertSafeDirectory(root, run.directory);
      const marker = JSON.parse(await readFile(path.join(run.directory, 'run.json'), 'utf8'));
      await cleanup(id, marker.port);
    }
    return;
  }
  if (args.includes('--list')) {
    await command(process.execPath, [path.join(frontend, 'node_modules/@playwright/test/cli.js'), 'test', ...args], { cwd: frontend });
    return;
  }
  const port = Number(process.env.E2E_PORT ?? 4300);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('E2E_PORT must be 1024..65535');
  await portAvailable(port);
  await command('docker', ['info', '--format', '{{.ServerVersion}}']);
  const id = `carcare-e2e-${Date.now()}-${randomBytes(4).toString('hex')}`;
  const run = environment(id, port);
  await assertSafeDirectory(root, run.directory);
  await mkdir(run.directory, { recursive: true });
  await writeFile(path.join(run.directory, 'run.json'), JSON.stringify({ id, port }));
  console.log(`E2E project: ${id}`);
  let failure;
  try {
    await command('dotnet', ['run', '--project', 'backend/tools/CarCare.Provision', '--', run.secrets]);
    const config = JSON.parse(await command('docker', [...run.compose, 'config', '--format', 'json'], { env: run.env, capture: true }));
    validateCompose(config, id, run.secrets);
    await command('docker', [...run.compose, 'up', '--build', '--detach', '--wait', '--wait-timeout', '180'], { env: run.env });
    const baseURL = `http://localhost:${port}`;
    const response = await fetch(`${baseURL}/api/auth/session`, { signal: AbortSignal.timeout(10_000) });
    if (response.status !== 401) throw new Error(`Gateway readiness returned ${response.status}, expected 401`);
    await command(process.execPath, [path.join(frontend, 'node_modules/@playwright/test/cli.js'), 'test', ...args], {
      cwd: frontend, env: { ...process.env, E2E_BASE_URL: baseURL },
    });
  } catch (error) {
    failure = error;
  } finally {
    cleaning = true;
    try {
      const logs = await command('docker', [...run.compose, 'logs', '--no-color'], { env: run.env, capture: true });
      await writeFile(path.join(run.directory, 'services.log'), logs);
    } catch (error) { console.error(`Could not collect logs: ${error.message}`); }
    try { await cleanup(id, port); }
    catch (error) { failure ??= error; console.error(`Cleanup failed; run npm run test:e2e:cleanup -- ${id}`); }
  }
  if (failure) throw failure;
  if (interrupted) throw new Error('E2E interrupted');
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
