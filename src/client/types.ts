import type { Resolver } from '../resolvers/types.js';
import type { Target } from '../targets/types.js';

export type ClientConfig = {
	/** Absolute repo root. */
	root: string;
	/** Vite root relative to the repo root, e.g. `apps/web`. Framework paths are relative to the Vite root. */
	base: string;
	resolvers: Resolver[];
	target: Target;
};
