import { readFileSync } from 'node:fs';
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, describe, expect, test } from 'vitest';
import Loops from './fixtures/Loops.svelte';
import Page from './fixtures/Page.svelte';
import svelte from './svelte.js';

// Real components compiled in dev mode, so these break if Svelte changes __svelte_meta.
const PAGE = 'src/resolvers/fixtures/Page.svelte';
const CARD = 'src/resolvers/fixtures/Card.svelte';

const lineOf = (file: string, snippet: string) =>
	readFileSync(file, 'utf8').split('\n').findIndex((l) => l.includes(snippet)) + 1;

let app: ReturnType<typeof mount> | undefined;
afterEach(() => {
	if (app) unmount(app);
	app = undefined;
	document.body.innerHTML = '';
});

function render(initial: Record<string, unknown> = {}) {
	const props = $state(initial);
	app = mount(Page, { target: document.body, props });
	return props;
}
const one = (selector: string) => document.querySelector(selector)!;
const all = (selector: string) => [...document.querySelectorAll(selector)];

test('plain element: location, tag and text', () => {
	render();
	expect(svelte.resolve(one('h1'))).toEqual({
		tag: 'h1',
		text: 'Title',
		file: PAGE,
		line: lineOf(PAGE, '<h1>'),
		column: 2,
		chain: [],
		framework: 'svelte'
	});
});

test('component inside a loop: component frame, then loop frame with index', () => {
	render();
	const ref = svelte.resolve(all('.card p')[2])!;
	expect(ref).toMatchObject({ tag: 'p', text: 'Orders', file: CARD, line: lineOf(CARD, '<p>') });
	expect(ref.chain).toEqual([
		{ kind: 'component', name: 'Card', file: PAGE, line: lineOf(PAGE, '<Card') },
		{ kind: 'loop', name: 'each', file: PAGE, line: lineOf(PAGE, '{#each items'), index: 2 }
	]);
});

test('condition frame', () => {
	render();
	expect(svelte.resolve(one('.note'))!.chain).toEqual([
		{ kind: 'condition', name: 'if', file: PAGE, line: lineOf(PAGE, '{#if') }
	]);
});

test('nested loops: an index per level, innermost first', () => {
	render();
	const ref = svelte.resolve(all('span')[3])!; // 'd': row 1, cell 1
	expect(ref.text).toBe('d');
	expect(ref.chain.map((f) => [f.line, f.index])).toEqual([
		[lineOf(PAGE, '{#each row'), 1],
		[lineOf(PAGE, '{#each [['), 1]
	]);
});

test('loop items added after mount get the right index', () => {
	const props = render();
	props.items = ['Revenue', 'Customers', 'Orders', 'Refunds'];
	flushSync();
	const ref = svelte.resolve(all('.card')[3])!;
	expect(ref.text).toBe('Refunds');
	expect(ref.chain.find((f) => f.kind === 'loop')!.index).toBe(3);
});

test('{@html} content points at the element that renders it', () => {
	render();
	expect(svelte.resolve(one('.raw b'))).toMatchObject({
		tag: 'b',
		text: 'raw',
		file: PAGE,
		line: lineOf(PAGE, 'class="raw"')
	});
});

test('{@render} sites are left out of the chain', () => {
	render();
	expect(svelte.resolve(one('em'))!.chain).toEqual([
		{ kind: 'component', name: 'Wrapper', file: PAGE, line: lineOf(PAGE, '<Wrapper>') }
	]);
});

// Library and framework internals (e.g. SvelteKit's root.svelte) live in node_modules.
// Faked here, since fixtures can't live there.
describe('code the user does not own', () => {
	const LIB = '/repo/node_modules/ui-kit/Button.svelte';
	const KIT = '/repo/node_modules/@sveltejs/kit/src/runtime/components/root.svelte';
	const entry = (type: string, file: string, line: number, parent: unknown = null, componentTag?: string) =>
		({ type, file, line, column: 0, parent, componentTag });

	function element(file: string, parent: unknown) {
		const el = document.createElement('button');
		el.textContent = 'Save';
		Object.assign(el, { __svelte_meta: { loc: { file, line: 3, column: 0 }, parent } });
		document.body.append(el);
		return el;
	}

	test('framework frames are skipped', () => {
		const kit = entry('component', KIT, 38, entry('if', KIT, 31), 'Component');
		const el = element('src/routes/+page.svelte', entry('if', 'src/routes/+page.svelte', 9, kit));
		expect(svelte.resolve(el)!.chain).toEqual([
			{ kind: 'condition', name: 'if', file: 'src/routes/+page.svelte', line: 9 }
		]);
	});

	test('SvelteKit 2 root frames (relative .svelte-kit paths) are skipped', () => {
		const ROOT2 = '.svelte-kit/generated/root.svelte';
		const kit = entry('component', ROOT2, 52, entry('if', ROOT2, 47), 'Pyramid_1');
		const el = element('src/routes/+page.svelte', entry('each', 'src/routes/+page.svelte', 9, kit));
		expect(svelte.resolve(el)!.chain.map((f) => f.file)).toEqual(['src/routes/+page.svelte']);
	});

	test('elements inside a library component point at where the user uses it', () => {
		const use = entry('component', 'src/routes/+page.svelte', 12, null, 'Button');
		expect(svelte.resolve(element(LIB, use))).toEqual({
			tag: 'button',
			text: 'Save',
			file: 'src/routes/+page.svelte',
			line: 12,
			chain: [{ kind: 'component', name: 'Button', file: 'src/routes/+page.svelte', line: 12 }],
			framework: 'svelte'
		});
	});

	test('elements entirely inside framework code are not ours', () => {
		expect(svelte.resolve(element(KIT, entry('if', KIT, 31)))).toBeNull();
	});
});

test('elements Svelte did not create are not ours', () => {
	const el = document.createElement('div');
	document.body.append(el);
	expect(svelte.resolve(el)).toBeNull();
});

// Loop index edge cases. Known limitation: the index counts earlier items rendered by the
// same template node, so it's wrong when items render different elements, or nothing.
// See docs/ARCHITECTURE.md "Known limitations". `test.fails` flips when it gets fixed.
describe('loop index edge cases', () => {
	const loopIndex = (el: Element) => svelte.resolve(el)!.chain.find((f) => f.kind === 'loop')!.index;

	test('items with several top-level elements', () => {
		app = mount(Loops, { target: document.body });
		expect(all('.multi dd').map(loopIndex)).toEqual([0, 1, 2]);
	});

	test.fails('items whose top-level element differs per item ({#if} inside {#each})', () => {
		app = mount(Loops, { target: document.body });
		expect(loopIndex(one('.mixed p'))).toBe(1); // 'b' is the 2nd item; we report 0
	});

	test.fails('items that render nothing', () => {
		app = mount(Loops, { target: document.body });
		expect(loopIndex(one('.sparse p'))).toBe(1); // 'a' renders nothing; we report 0
	});
});
