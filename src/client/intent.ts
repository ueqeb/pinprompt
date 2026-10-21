import type { Intent, Ref } from '../types.js';

/**
 * `move [1] after [2]` + refs by number → Intent. Unknown numbers stay as plain text, and so
 * does `[n]` glued to a word, like `arr[1]`.
 */
export function toIntent(text: string, refs: Map<number, Ref>): Intent {
	const intent: Intent = [];
	const parts = text.trim().split(/(?<!\w)\[(\d+)\]/);
	parts.forEach((part, i) => {
		const ref = i % 2 ? refs.get(Number(part)) : undefined;
		const value = i % 2 && !ref ? `[${part}]` : (ref ?? part);
		const last = intent.length - 1;
		if (typeof value === 'string' && typeof intent[last] === 'string') intent[last] += value;
		else if (value !== '') intent.push(value);
	});
	return intent;
}

/** Climb `levels` parents, stopping below `<body>`. */
export function widen(el: Element, levels: number) {
	for (let i = 0; i < levels && el.parentElement && el.parentElement !== document.body; i++) {
		el = el.parentElement;
	}
	return el;
}
