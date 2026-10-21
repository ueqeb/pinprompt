import { expect, test, vi } from 'vitest';
import type { Resolver } from '../resolvers/types.js';
import type { Ref } from '../types.js';
import { resolve } from './resolve.js';
import type { ClientConfig } from './types.js';

const fixed = (ref: Ref | null): Resolver => ({ id: 'fake', name: 'Fake', resolve: () => ref });

const ref = (file: string): Ref => ({
	tag: 'div',
	text: 'x',
	file,
	line: 1,
	chain: [{ kind: 'component', file, line: 2 }]
});

const config = (resolvers: Resolver[], base = 'apps/web'): ClientConfig => ({
	root: '/repo',
	base,
	resolvers,
	target: { id: 't', name: 'T', render: () => '' }
});

const el = document.createElement('section');
el.textContent = '  Hello\n  world ';

test('prefixes Vite-root-relative paths with base', () => {
	const out = resolve(el, config([fixed(ref('src/A.svelte'))]));
	expect(out.file).toBe('apps/web/src/A.svelte');
	expect(out.chain[0].file).toBe('apps/web/src/A.svelte');
});

test('makes absolute paths inside the repo relative', () => {
	expect(resolve(el, config([fixed(ref('/repo/apps/web/src/A.svelte'))])).file).toBe(
		'apps/web/src/A.svelte'
	);
});

test('leaves paths alone when the Vite root is the repo root', () => {
	expect(resolve(el, config([fixed(ref('src/A.svelte'))], '')).file).toBe('src/A.svelte');
});

test('first resolver that knows the element wins', () => {
	const out = resolve(el, config([fixed(null), fixed(ref('src/B.svelte')), fixed(ref('src/C.svelte'))]));
	expect(out.file).toBe('apps/web/src/B.svelte');
});

test('falls back to tag and text when no resolver knows the element', () => {
	expect(resolve(el, config([fixed(null)]))).toEqual({ tag: 'section', text: 'Hello world', chain: [] });
});

test('a resolver that throws is skipped, not fatal', () => {
	const broken: Resolver = { id: 'broken', name: 'Broken', resolve: () => { throw new Error('boom'); } };
	const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
	expect(resolve(el, config([broken, fixed(ref('src/B.svelte'))])).file).toBe('apps/web/src/B.svelte');
	expect(warn).toHaveBeenCalledOnce();
	warn.mockRestore();
});
