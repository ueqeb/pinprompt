import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addPlugin, detectPackageManager, installCommand, LOCKFILES } from './init.js';

const CONFIGS = ['vite.config.ts', 'vite.config.js', 'vite.config.mts', 'vite.config.mjs'];
const MANUAL = `Add it by hand:

  import { pinprompt } from 'pinprompt/vite';
  plugins: [sveltekit(), pinprompt()]
`;

const [command] = process.argv.slice(2);
if (command !== 'init') {
	console.log('Usage: npx pinprompt init   (run it in your SvelteKit app folder)');
	process.exit(command ? 1 : 0);
}

const config = CONFIGS.find((file) => existsSync(file));
if (!config || !existsSync('package.json')) {
	console.error('No vite.config or package.json here. Run this in your SvelteKit app folder.');
	process.exit(1);
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
if (!pkg.devDependencies?.pinprompt && !pkg.dependencies?.pinprompt) {
	const pm = detectPackageManager(nearestLockfiles(), process.env.npm_config_user_agent);
	const [cmd, args] = installCommand(pm, `pinprompt@${ownVersion()}`);
	console.log(`$ ${cmd} ${args.join(' ')}`);
	const result = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
	if (result.error) {
		console.error(`Couldn't run ${cmd}: ${result.error.message}\nInstall pinprompt yourself, then run init again.`);
		process.exit(1);
	}
	if (result.status !== 0) process.exit(result.status ?? 1);
}

const source = readFileSync(config, 'utf8');
const updated = addPlugin(source);
if (updated === null) {
	console.log(`Couldn't safely edit ${config} (no single top-level \`plugins: [...]\`). ${MANUAL}`);
	process.exit(1);
}
if (updated === source) console.log(`${config} already uses pinprompt.`);
else {
	writeFileSync(config, updated);
	console.log(`Added pinprompt to ${config}.`);
}
console.log('Start your dev server and press Alt+P in the browser.');

// In monorepos the lockfile lives at the workspace root. Stop at the repo root, so a
// stray lockfile in a parent folder (e.g. home) can't pick the package manager.
function nearestLockfiles() {
	for (let dir = process.cwd(); ; dir = dirname(dir)) {
		let files: string[] = [];
		try {
			files = readdirSync(dir);
		} catch {}
		if (LOCKFILES.some(([file]) => files.includes(file))) return files;
		if (files.includes('.git') || dirname(dir) === dir) return [];
	}
}

function ownVersion(): string {
	// dist/cli.js → package.json
	const file = join(dirname(fileURLToPath(import.meta.url)), '../package.json');
	return JSON.parse(readFileSync(file, 'utf8')).version;
}
