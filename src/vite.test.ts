import { join } from 'node:path';
import { afterEach, expect, test, vi } from 'vitest';
import { pinprompt } from './vite.js';

const repo = join(import.meta.dirname, '..');

afterEach(() => vi.restoreAllMocks());

// `cwd` is where the dev server runs; Svelte reports paths relative to it.
function setup(options?: Parameters<typeof pinprompt>[0], cwd = join(repo, 'playground')) {
	vi.spyOn(process, 'cwd').mockReturnValue(cwd);
	const plugin = pinprompt(options) as any;
	plugin.configResolved({ root: join(repo, 'playground') });
	return plugin;
}

test('config module points at built-ins and knows the repo layout', () => {
	const code: string = setup().load('\0virtual:pinprompt/config');
	expect(code).toContain(join(repo, 'src', 'resolvers', 'svelte.js'));
	expect(code).toContain(join(repo, 'src', 'targets', 'claude-code.js'));
	expect(code).toContain(`root: ${JSON.stringify(repo)}`);
	expect(code).toContain(`base: "playground"`);
});

test('base follows the working directory, not the Vite root', () => {
	// `vite dev playground` run from the repo root: Svelte already reports `playground/src/...`.
	expect(setup({}, repo).load('\0virtual:pinprompt/config')).toContain(`base: ""`);
});

test('unknown built-ins and missing files fail with a clear message', () => {
	expect(() => setup({ target: 'claude' })).toThrow(/unknown target "claude"\. Built in: .*claude-code/);
	expect(() => setup({ resolvers: ['./nope.ts'] })).toThrow(/resolver file not found/);
});

test('custom resolvers and targets resolve from the Vite root', () => {
	const code: string = setup({
		resolvers: ['../src/resolvers/svelte.ts'],
		target: '../src/targets/claude-code.ts'
	}).load('\0virtual:pinprompt/config');
	expect(code).toContain(join(repo, 'src', 'resolvers', 'svelte.ts'));
	expect(code).toContain(join(repo, 'src', 'targets', 'claude-code.ts'));
});

test('injects the client into Vite and Vite+ dev clients only', () => {
	const { filter } = setup().transform;
	expect(filter.id.test('/node_modules/vite/dist/client/client.mjs')).toBe(true);
	expect(filter.id.test('/node_modules/vite-plus-core/dist/vite/client/client.mjs')).toBe(true);
	expect(filter.id.test('/src/routes/+page.svelte')).toBe(false);
});
