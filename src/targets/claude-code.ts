import type { Frame, Ref } from '../types.js';
import { numberRefs, ordinal } from './helpers.js';
import type { Target } from './types.js';

// The sentence keeps `[n]` markers; refs are listed below it.
// `file:line` rather than `@file`, which would pull whole files into context.
const claudeCode: Target = {
	id: 'claude-code',
	name: 'Claude Code',
	render(intent) {
		const { sentence, refs } = numberRefs(intent);
		if (!refs.length) return sentence;

		// Refs side by side usually share their context; repeat it as `same as [n]`.
		const seen = new Map<string, number>();
		const lines = refs.map((ref, i) => {
			const [head, context, key] = formatRef(ref, i + 1);
			if (!context) return head;
			const first = seen.get(key);
			if (first === undefined) seen.set(key, i + 1);
			return `${head}\n    in ${first === undefined ? context : `same as [${first}]`}`;
		});
		return [sentence, '', ...lines].join('\n');
	}
};

export default claudeCode;

function formatRef(ref: Ref, n: number): [head: string, context: string, key: string] {
	const head = [
		`[${n}] <${ref.tag}>`,
		ref.text && JSON.stringify(ref.text),
		ref.file ? `${ref.file}:${ref.line}` : '(no source location)'
	]
		.filter(Boolean)
		.join(' ');

	// Only where the element is used (components) and which item (loops). Conditions and
	// other blocks add nothing: the element's own line already says which branch it's in.
	const frames = ref.chain.filter((f) => f.kind === 'component' || f.kind === 'loop');
	if (!frames.length) return [head, '', ''];

	// A frame in the same file as the one before it shortens to `:line`.
	let previous = ref.file;
	const context = frames.map((frame) => {
		const at = frame.file === previous ? `:${frame.line}` : `${frame.file}:${frame.line}`;
		previous = frame.file;
		return `${describe(frame)} ${at}`;
	});
	// Compared by frames, not text: `:line` shorthand means different files for different refs.
	return [head, context.join(' › '), JSON.stringify(frames)];
}

function describe(frame: Frame) {
	if (frame.kind === 'component') return `<${frame.name ?? 'component'}>`;
	const name = frame.name ?? frame.kind;
	return frame.index === undefined ? name : `${name} (${ordinal(frame.index + 1)} item)`;
}
