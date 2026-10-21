import type { Frame } from '../types.js';
import { visibleText } from './helpers.js';
import type { Resolver } from './types.js';

// What Svelte 5 attaches to elements in dev mode (svelte/src/internal/client/dev/elements.js).
type Entry = {
	type: string;
	file: string;
	line: number;
	column: number;
	parent: Entry | null;
	componentTag?: string;
};
type Meta = { loc: { file: string; line: number; column: number }; parent: Entry | null };
type MetaElement = Element & { __svelte_meta?: Meta };

const kinds: Record<string, Frame['kind']> = { component: 'component', each: 'loop', if: 'condition' };

const svelte: Resolver = {
	id: 'svelte',
	name: 'Svelte',
	resolve(el) {
		// Elements Svelte didn't create (e.g. from {@html}) point at the nearest one it did.
		const owner = closestWithMeta(el);
		if (!owner) return null;

		const { loc, parent } = owner.__svelte_meta!;
		const chain: Frame[] = [];
		for (let entry = parent; entry; entry = entry.parent) {
			// Skip code the user doesn't own, and {@render} sites (e.g. a layout's children) that add nothing.
			if (external(entry.file) || entry.type === 'render') continue;
			const frame: Frame = {
				kind: kinds[entry.type] ?? 'other',
				name: entry.componentTag ?? entry.type,
				file: entry.file,
				line: entry.line
			};
			if (entry.type === 'each') frame.index = loopIndex(owner, entry);
			chain.push(frame);
		}

		// Inside a library component: point at where the user's code uses it.
		const [use] = chain;
		if (external(loc.file) && !use) return null;
		const at = external(loc.file)
			? { file: use.file, line: use.line }
			: { file: loc.file, line: loc.line, column: loc.column + 1 };

		return { tag: el.tagName.toLowerCase(), text: visibleText(el), ...at, chain, framework: 'svelte' };
	}
};

export default svelte;

// Kit 3 ships its root component in node_modules; Kit 2 generates it into .svelte-kit (reported relative).
const external = (file: string) => /(^|\/)(node_modules|\.svelte-kit)\//.test(file);

function closestWithMeta(el: Element) {
	for (let node: MetaElement | null = el; node; node = node.parentElement) {
		if (node.__svelte_meta) return node;
	}
	return null;
}

function inLoop(el: MetaElement, loop: Entry) {
	for (let entry = el.__svelte_meta?.parent; entry; entry = entry.parent) {
		if (entry === loop) return true;
	}
	return false;
}

// Svelte doesn't record item indexes, so: climb to the item's outermost element,
// then count earlier siblings created by the same template node in the same loop.
function loopIndex(el: MetaElement, loop: Entry) {
	let root = el;
	while (root.parentElement && inLoop(root.parentElement, loop)) root = root.parentElement;

	const { file, line, column } = root.__svelte_meta!.loc;
	let index = 0;
	for (let s: MetaElement | null = root.previousElementSibling; s; s = s.previousElementSibling) {
		const loc = s.__svelte_meta?.loc;
		if (loc?.file === file && loc.line === line && loc.column === column && inLoop(s, loop)) index++;
	}
	return index;
}
