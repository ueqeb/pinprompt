import type { Intent, Ref } from '../types.js';

// Shared sample intents. Every target snapshots its output for all of them,
// so a PR shows exactly what each AI receives. Paths are repo-relative, as the core delivers them.

const PAGE = 'apps/web/src/routes/+page.svelte';
const CARD = 'apps/web/src/lib/StatCard.svelte';

const card = (text: string, index: number): Ref => ({
	tag: 'div',
	text,
	file: CARD,
	line: 5,
	column: 1,
	chain: [
		{ kind: 'component', name: 'StatCard', file: PAGE, line: 15 },
		{ kind: 'loop', name: 'each', file: PAGE, line: 14, index }
	],
	framework: 'svelte'
});

const title: Ref = {
	tag: 'h1',
	text: 'Dashboard',
	file: PAGE,
	line: 12,
	column: 2,
	chain: [],
	framework: 'svelte'
};

const legacy: Ref = {
	tag: 'section',
	text: 'Legacy stats Old numbers nobody looks at.',
	file: PAGE,
	line: 19,
	column: 2,
	chain: [{ kind: 'condition', name: 'if', file: PAGE, line: 18 }],
	framework: 'svelte'
};

const cell: Ref = {
	tag: 'td',
	text: '318',
	file: PAGE,
	line: 31,
	column: 6,
	chain: [
		{ kind: 'loop', name: 'each', file: PAGE, line: 30, index: 1 },
		{ kind: 'loop', name: 'each', file: PAGE, line: 28, index: 4 }
	],
	framework: 'svelte'
};

const PERF = 'apps/web/src/routes/performance/+page.svelte';
const delta = (text: string, line: number): Ref => ({
	tag: 'span',
	text,
	file: PERF,
	line,
	column: 9,
	chain: [
		{ kind: 'condition', name: 'if', file: PERF, line: 172 },
		{ kind: 'loop', name: 'each', file: PERF, line: 309, index: 0 },
		{ kind: 'loop', name: 'each', file: PERF, line: 302, index: 0 },
		{ kind: 'condition', name: 'if', file: PERF, line: 296 },
		{ kind: 'loop', name: 'each', file: PERF, line: 270, index: 0 }
	],
	framework: 'svelte'
});

const widget: Ref = { tag: 'iframe', text: '', chain: [] };

export const fixtures: Record<string, Intent> = {
	'no refs': ['fix the spacing on mobile'],
	edit: ['make ', title, ' smaller and left-aligned'],
	create: ['add a card like ', card('Revenue $12,400', 0), ' right after ', card('Orders 318', 2)],
	remove: ['remove ', legacy],
	'nested loop item': ['highlight ', cell, ' in red when below target'],
	'same element twice': ['move ', title, ' below ', legacy, ' and make ', title, ' bold'],
	'no source location': ['hide ', widget, ' on small screens'],
	'shared context in different files': ['align ', { ...card('Revenue $12,400', 0), file: PAGE, line: 40 }, ' with ', card('Orders 318', 0)],
	'deep loops inside conditions': ['decrease the gap between ', delta('−$11', 174), ' and ', delta('▼33%', 179)]
};
