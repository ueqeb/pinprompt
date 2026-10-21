import type { Ref } from '../types.js';

/** `output` is the last rendered prompt, kept until dismissed. */
export type Draft = { open: boolean; text: string; refs: [number, Ref][]; output: string };

const KEY = 'pinprompt:draft';
const empty: Draft = { open: false, text: '', refs: [], output: '' };

// Per tab. Storage can be unavailable (private mode, blocked site data), so never throw.
export function load(): Draft {
	try {
		return { ...empty, ...JSON.parse(sessionStorage.getItem(KEY) ?? '{}') };
	} catch {
		return empty;
	}
}

export function save(draft: Draft) {
	try {
		sessionStorage.setItem(KEY, JSON.stringify(draft));
	} catch {}
}
