import { existsSync, readdirSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

export interface Options {
	/** Built-in ids or module paths, tried in order for each element. */
	resolvers?: string[];
	/** Built-in id or module path. */
	target?: string;
}

const CONFIG = 'virtual:pinprompt/config';
const CLIENT = 'virtual:pinprompt/client';
const dist = dirname(fileURLToPath(import.meta.url));
// Posix paths: what frameworks report in the browser, and what Vite expects as ids.
const posix = (path: string) => path.split(sep).join('/');

// Same injection point as Svelte Inspector, including the Vite+ path variant.
const viteClient = /(?:vite\/dist|vite\/dist\/vite|vite-plus-core\/dist\/vite)\/client\/client\.mjs(?:\?|$)/;

export function pinprompt(options: Options = {}): Plugin {
	let root = '';
	let base = '';
	let resolvers: string[] = [];
	let target = '';

	return {
		name: 'pinprompt',
		apply: 'serve',

		configResolved(config) {
			const repo = findRepoRoot(config.root) ?? process.cwd();
			root = posix(repo);
			// Svelte reports dev paths relative to the working directory, which isn't always the
			// Vite root (e.g. `vite dev apps/web` from the repo root).
			base = posix(relative(repo, process.cwd()));
			resolvers = (options.resolvers ?? ['svelte']).map((r) => modulePath('resolvers', r, config.root));
			target = modulePath('targets', options.target ?? 'claude-code', config.root);
		},

		resolveId(id) {
			if (id === CONFIG) return '\0' + CONFIG;
			if (id === CLIENT) return posix(join(dist, 'client.js'));
		},

		load(id) {
			if (id !== '\0' + CONFIG) return;
			return [
				...resolvers.map((r, i) => `import r${i} from ${JSON.stringify(r)};`),
				`import target from ${JSON.stringify(target)};`,
				`export default {`,
				`  root: ${JSON.stringify(root)},`,
				`  base: ${JSON.stringify(base)},`,
				`  resolvers: [${resolvers.map((_, i) => `r${i}`).join(', ')}],`,
				`  target,`,
				`};`
			].join('\n');
		},

		transform: {
			filter: { id: viteClient },
			handler(code, id) {
				// Vite < 6.3 ignores `filter`, so check again.
				if (!viteClient.test(id)) return;
				return { code: `${code}\nimport(${JSON.stringify(CLIENT)});` };
			}
		}
	};
}

/** A built-in id (`'svelte'`) or a path relative to the Vite root. Fails early with a clear message. */
function modulePath(kind: 'resolvers' | 'targets', spec: string, viteRoot: string) {
	const kindName = kind.slice(0, -1);
	if (spec.startsWith('.') || isAbsolute(spec)) {
		const path = resolve(viteRoot, spec);
		if (!existsSync(path)) throw new Error(`pinprompt: ${kindName} file not found: ${path}`);
		return posix(path);
	}
	// Built-ins are the modules next to this file (.js when built, .ts when run from source).
	const builtIn = readdirSync(join(dist, kind))
		.filter((f) => /^[\w-]+\.(js|ts)$/.test(f))
		.map((f) => f.replace(/\.(js|ts)$/, ''));
	if (!builtIn.includes(spec)) {
		throw new Error(`pinprompt: unknown ${kindName} "${spec}". Built in: ${builtIn.join(', ')}`);
	}
	return posix(join(dist, kind, `${spec}.js`));
}

function findRepoRoot(start: string) {
	for (let dir = start; ; dir = dirname(dir)) {
		if (existsSync(join(dir, '.git'))) return dir;
		if (dirname(dir) === dir) return null;
	}
}
