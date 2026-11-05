const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync, spawn } = require('node:child_process');
const dotenv = require('dotenv');

const root = path.resolve(__dirname, '..');
const name = 'habitquest-postgres-local';
const routerFile = path.join(root, '.env.model-router.local');
const routerEnvironment = fs.existsSync(routerFile) ? dotenv.parse(fs.readFileSync(routerFile)) : {};
const environment = { ...dotenv.parse(fs.readFileSync(path.join(root, '.env'))), ...routerEnvironment, ...process.env };
const target = new URL(environment.DATABASE_URL);
if (!['localhost', '127.0.0.1'].includes(target.hostname)) throw new Error('Local database target required');
const docker = (args, env = process.env) => spawnSync('docker', args, { encoding: 'utf8', env });
let inspection = docker(['inspect', name]);
if (inspection.status !== 0) {
  const password = crypto.randomBytes(24).toString('hex');
  const created = docker(['run', '-d', '--name', name, '--restart', 'unless-stopped', '-p', '127.0.0.1:5432:5432', '-v', 'habitquest-foundation-data:/var/lib/postgresql/data', '-e', 'POSTGRES_USER', '-e', 'POSTGRES_PASSWORD', '-e', 'POSTGRES_DB', 'postgres:16-alpine'], { ...process.env, POSTGRES_USER: 'habitquestlocal', POSTGRES_PASSWORD: password, POSTGRES_DB: target.pathname.slice(1) });
  if (created.status !== 0) throw new Error('Could not create local PostgreSQL. Check Docker and port 5432.');
  inspection = docker(['inspect', name]);
}
const container = JSON.parse(inspection.stdout)[0];
const config = Object.fromEntries(container.Config.Env.map((entry) => { const separator = entry.indexOf('='); return [entry.slice(0, separator), entry.slice(separator + 1)]; }));
if (!config.POSTGRES_PASSWORD) throw new Error('Local PostgreSQL has no password; replace only the uninitialized container.');
if (!container.State.Running && docker(['start', name]).status !== 0) throw new Error('Could not start local PostgreSQL');
const ready = docker(['exec', name, 'pg_isready', '-U', config.POSTGRES_USER, '-d', config.POSTGRES_DB]);
if (ready.status !== 0) throw new Error('PostgreSQL is initializing. Run the local command again after it is ready.');
target.hostname = '127.0.0.1';
target.port = '5432';
target.username = config.POSTGRES_USER;
target.password = config.POSTGRES_PASSWORD;
environment.DATABASE_URL = target.toString();

if (process.argv.includes('--setup')) {
  const applied = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'db', 'push', '--schema', 'prisma/schema.prisma', '--skip-generate'], { cwd: root, env: environment, stdio: 'inherit' });
  if (applied.status !== 0) process.exit(applied.status || 1);
  const seeded = spawnSync(process.execPath, ['-r', 'ts-node/register', 'prisma/seed.ts'], { cwd: root, env: environment, stdio: 'inherit' });
  process.exit(seeded.status || 0);
} else {
  const server = spawn(process.execPath, ['dist/src/main.js'], { cwd: root, env: environment, stdio: 'inherit' });
  server.on('exit', (code) => process.exit(code || 0));
}