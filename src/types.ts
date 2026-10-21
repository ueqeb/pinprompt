// The public contract between resolvers and targets.
// Only add optional fields. Never rename or remove outside a major version.

export type Frame = {
	kind: 'component' | 'loop' | 'condition' | 'other';
	/** Component name (`StatCard`) or block name (`each`, `if`, `await`...). */
	name?: string;
	file: string;
	line: number;
	/** For loops: which item contains the element, 0-based. */
	index?: number;
};

export type Ref = {
	tag: string;
	/** Short visible text, for humans and disambiguation. */
	text: string;
	/** Repo-relative, e.g. `src/routes/+page.svelte`. Missing when no resolver knows the element. */
	file?: string;
	line?: number;
	/** 1-based. */
	column?: number;
	/** Source context, innermost first. */
	chain: Frame[];
	/** Id of the resolver that produced this ref. */
	framework?: string;
};

/** Free text interleaved with refs. */
export type Intent = (string | Ref)[];
