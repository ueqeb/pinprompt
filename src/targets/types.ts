import type { Intent } from '../types.js';

export interface RenderContext {
	/** Absolute path of the repo root. */
	root: string;
}

export interface Target {
	/** Used in config, e.g. `'claude-code'`. */
	id: string;
	name: string;
	/** Pure: no DOM, network or clipboard access. */
	render(intent: Intent, ctx: RenderContext): string;
	/** Optional own delivery channel. Defaults to the clipboard. */
	deliver?(text: string): Promise<void>;
}
