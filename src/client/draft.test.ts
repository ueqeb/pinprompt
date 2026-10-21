import { beforeEach, expect, test } from 'vitest';
import { load, save, type Draft } from './draft.js';

beforeEach(() => sessionStorage.clear());

test('round-trips the draft', () => {
	const draft: Draft = {
		open: true,
		text: 'move [1]',
		refs: [[1, { tag: 'div', text: 'x', chain: [] }]],
		output: 'move [1]\n\n[1] <div> "x"'
	};
	save(draft);
	expect(load()).toEqual(draft);
});

test('empty or broken storage gives an empty draft', () => {
	expect(load()).toEqual({ open: false, text: '', refs: [], output: '' });
	sessionStorage.setItem('pinprompt:draft', '{nope');
	expect(load()).toEqual({ open: false, text: '', refs: [], output: '' });
});
