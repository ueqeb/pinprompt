import { describe, expect, test } from 'vitest';
import { addPlugin, detectPackageManager, installCommand } from './init.js';

describe('addPlugin', () => {
	test('single-line plugins with other imports (a real SvelteKit 2 app)', () => {
		const source = [
			"import { defineConfig } from 'vitest/config';",
			"import { sveltekit } from '@sveltejs/kit/vite';",
			"import { websocketserver } from './src/websocket';",
			'',
			'export default defineConfig({',
			'\tplugins: [sveltekit(), websocketserver],',
			"\ttest: { include: ['src/**/*.{test,spec}.{js,ts}'] }",
			'});'
		].join('\n');
		expect(addPlugin(source)).toBe(
			[
				"import { defineConfig } from 'vitest/config';",
				"import { sveltekit } from '@sveltejs/kit/vite';",
				"import { websocketserver } from './src/websocket';",
				"import { pinprompt } from 'pinprompt/vite';",
				'',
				'export default defineConfig({',
				'\tplugins: [sveltekit(), websocketserver, pinprompt()],',
				"\ttest: { include: ['src/**/*.{test,spec}.{js,ts}'] }",
				'});'
			].join('\n')
		);
	});

	test('multi-line plugins with nested options and comments (sv create, SvelteKit 3)', () => {
		const source = [
			"import tailwindcss from '@tailwindcss/vite';",
			"import { sveltekit } from '@sveltejs/kit/vite';",
			"import { defineConfig } from 'vite';",
			'',
			'export default defineConfig({',
			'\tplugins: [',
			'\t\ttailwindcss(),',
			'\t\tsveltekit({',
			'\t\t\t// runes: ({ filename }) => [x] ]',
			"\t\t\truns: ({ filename }) => filename.split(/[/\\\\]/).includes('node_modules') ? undefined : true",
			'\t\t})',
			'\t]',
			'});'
		].join('\n');
		const out = addPlugin(source)!;
		expect(out).toContain("import { defineConfig } from 'vite';\nimport { pinprompt } from 'pinprompt/vite';");
		expect(out).toContain('\t\t}),\n\t\tpinprompt()\n\t]\n});');
	});

	test('regex literals with brackets and quotes inside', () => {
		const out = addPlugin("import a from 'a';\nexport default { plugins: [a({ test: /[\"'\\]]+/ }), a(/]/)] };")!;
		expect(out).toContain("plugins: [a({ test: /[\"'\\]]+/ }), a(/]/), pinprompt()] };");
	});

	test('keeps a trailing comma style', () => {
		const out = addPlugin("import a from 'a';\nexport default { plugins: [\n\ta(),\n] };")!;
		expect(out).toContain('plugins: [\n\ta(),\n\tpinprompt(),\n]');
	});

	test('empty plugins, double quotes, no semicolons', () => {
		const out = addPlugin('import { defineConfig } from "vite"\nexport default defineConfig({ plugins: [] })')!;
		expect(out).toBe(
			'import { defineConfig } from "vite"\nimport { pinprompt } from "pinprompt/vite"\nexport default defineConfig({ plugins: [pinprompt()] })'
		);
	});

	test('multi-line imports', () => {
		const out = addPlugin("import {\n\ta,\n\tb\n} from 'x';\nexport default { plugins: [a()] };")!;
		expect(out).toContain("} from 'x';\nimport { pinprompt } from 'pinprompt/vite';\nexport");
	});

	test('a trailing line comment stays a comment', () => {
		const out = addPlugin("import a from 'a';\nexport default {\n\tplugins: [\n\t\ta() // must be first\n\t]\n};")!;
		expect(out).toContain('\t\ta(), // must be first\n\t\tpinprompt()\n\t]');
	});

	test('plugins mentioned in comments or strings are ignored', () => {
		const out = addPlugin(
			"import a from 'a';\n// old: plugins: [b()]\nexport default { name: 'plugins: []', plugins: [a()] };"
		)!;
		expect(out).toContain("// old: plugins: [b()]");
		expect(out).toContain("plugins: [a(), pinprompt()] };");
	});

	test('a pinprompt mention in a comment does not count as set up', () => {
		const out = addPlugin("import a from 'a';\n// TODO: try pinprompt\nexport default { plugins: [a()] };")!;
		expect(out).toContain('plugins: [a(), pinprompt()]');
	});

	test('arrow-function configs', () => {
		const out = addPlugin("import a from 'a';\nexport default defineConfig(({ mode }) => ({ plugins: [a()] }));")!;
		expect(out).toContain('plugins: [a(), pinprompt()]');
	});

	test('already set up: unchanged', () => {
		const source = "import { pinprompt } from 'pinprompt/vite';\nexport default { plugins: [pinprompt()] };";
		expect(addPlugin(source)).toBe(source);
	});

	test('shapes we cannot edit safely: null', () => {
		expect(addPlugin("export default { plugins }")).toBeNull();
		expect(addPlugin("const plugins = [a()];\nexport default { plugins: [...plugins] , build: { plugins: [] } }")).toBeNull();
		expect(addPlugin('export default { plugins: [a()')).toBeNull();
		// Nested `plugins` (esbuild's), with the real one passed as a variable.
		expect(addPlugin("export default { plugins: p, optimizeDeps: { esbuildOptions: { plugins: [] } } }")).toBeNull();
		// Only nested, no top-level plugins.
		expect(addPlugin("export default { optimizeDeps: { esbuildOptions: { plugins: [] } } }")).toBeNull();
	});
});

describe('package manager', () => {
	test('lockfile wins', () => {
		expect(detectPackageManager(['package.json', 'pnpm-lock.yaml'], 'npm/10')).toBe('pnpm');
		expect(detectPackageManager(['bun.lock'])).toBe('bun');
		expect(detectPackageManager(['yarn.lock'])).toBe('yarn');
		expect(detectPackageManager(['package-lock.json'], 'pnpm/9')).toBe('npm');
	});

	test('falls back to the runner, then npm', () => {
		expect(detectPackageManager([], 'pnpm/9.4.0 npm/? node/v22')).toBe('pnpm');
		expect(detectPackageManager([], '')).toBe('npm');
	});

	test('install commands', () => {
		expect(installCommand('npm')).toEqual(['npm', ['install', '-D', 'pinprompt']]);
		expect(installCommand('pnpm')).toEqual(['pnpm', ['add', '-D', 'pinprompt']]);
		expect(installCommand('bun')).toEqual(['bun', ['add', '-d', 'pinprompt']]);
		expect(installCommand('pnpm', 'pinprompt@0.0.1-alpha.0')).toEqual(['pnpm', ['add', '-D', 'pinprompt@0.0.1-alpha.0']]);
	});
});
