import type { Intent, Ref } from '../types.js';

/** Replaces refs with `[n]` markers and returns them in order. The same element twice gets the same number. */
export function numberRefs(intent: Intent) {
	const refs: Ref[] = [];
	const keys: string[] = [];
	const sentence = intent
		.map((part) => {
			if (typeof part === 'string') return part;
			const key = JSON.stringify(part);
			let i = keys.indexOf(key);
			if (i === -1) i = keys.push(key) - 1, refs.push(part);
			return `[${i + 1}]`;
		})
		.join('');
	return { sentence: sentence.trim(), refs };
}

/** 1 → '1st', 2 → '2nd', 11 → '11th'. */
export function ordinal(n: number) {
	const suffix = ['th', 'st', 'nd', 'rd'];
	const v = n % 100;
	return n + (suffix[(v - 20) % 10] || suffix[v] || suffix[0]);
}
