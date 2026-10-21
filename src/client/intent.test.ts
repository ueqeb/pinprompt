import { expect, test } from 'vitest';
import type { Ref } from '../types.js';
import { toIntent, widen } from './intent.js';

const ref = (tag: string): Ref => ({ tag, text: '', chain: [] });
const a = ref('a');
const b = ref('b');

test('splits text around [n] markers', () => {
	expect(toIntent(' move [1] after [2] ', new Map([[1, a], [2, b]]))).toEqual(['move ', a, ' after ', b]);
});

test('same marker twice gives the same ref', () => {
	expect(toIntent('[1] and [1]', new Map([[1, a]]))).toEqual([a, ' and ', a]);
});

test('[n] glued to a word is text, not a reference', () => {
	expect(toIntent('move [1] like arr[1]', new Map([[1, a]]))).toEqual(['move ', a, ' like arr[1]']);
});

test('unknown markers stay as text', () => {
	expect(toIntent('see [3] and [1]', new Map([[1, a]]))).toEqual(['see [3] and ', a]);
});

test('widen climbs parents but stops below body', () => {
	document.body.innerHTML = '<main><section><p>hi</p></section></main>';
	const p = document.querySelector('p')!;
	expect(widen(p, 0)).toBe(p);
	expect(widen(p, 1).tagName).toBe('SECTION');
	expect(widen(p, 9).tagName).toBe('MAIN');
});
