import type { Ref } from '../types.js';

export interface Resolver {
	/** Used in config, e.g. `'svelte'`. */
	id: string;
	name: string;
	/** Reads the element and returns a ref, or `null` if this element isn't yours. No side effects. */
	resolve(el: Element): Ref | null;
}
