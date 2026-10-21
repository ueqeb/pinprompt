import { readFileSync } from 'node:fs';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

// The client bundles the Svelte runtime, so it ships Svelte's MIT notice.
const svelteLicense = readFileSync(new URL('./node_modules/svelte/LICENSE.md', import.meta.url), 'utf8').trim();
const banners: Record<string, string> = {
	cli: '#!/usr/bin/env node',
	client: `/*! Includes Svelte (https://svelte.dev):\n\n${svelteLicense}\n*/`
};

// Builds everything into dist/. The client bundles its own Svelte runtime,
// so it works on any app, Svelte or not.
export default defineConfig({
	plugins: [svelte({ compilerOptions: { css: 'injected' } })],
	// Tests mount components, which needs Svelte's browser build.
	resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
	build: {
		target: 'es2022',
		minify: false,
		lib: {
			formats: ['es'],
			entry: {
				index: 'src/index.ts',
				vite: 'src/vite.ts',
				cli: 'src/cli.ts',
				client: 'src/client/index.ts',
				'resolvers/svelte': 'src/resolvers/svelte.ts',
				'targets/claude-code': 'src/targets/claude-code.ts'
			}
		},
		rolldownOptions: {
			external: [/^node:/, 'vite', 'virtual:pinprompt/config'],
			output: { banner: (chunk) => banners[chunk.name] ?? '' }
		}
	},
	test: {
		environment: 'happy-dom'
	}
});
