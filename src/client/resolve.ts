import { visibleText } from '../resolvers/helpers.js';
import type { Ref } from '../types.js';
import type { ClientConfig } from './types.js';

/** Element → Ref: first resolver that knows the element wins, with repo-relative paths. */
export function resolve(el: Element, config: ClientConfig): Ref {
	for (const resolver of config.resolvers) {
		let ref: Ref | null = null;
		try {
			ref = resolver.resolve(el);
		} catch (error) {
			// A broken resolver (e.g. a custom one) shouldn't break picking; try the next.
			console.warn(`pinprompt: resolver "${resolver.id}" failed`, error);
		}
		if (ref) return repoRelative(ref, config);
	}
	return { tag: el.tagName.toLowerCase(), text: visibleText(el), chain: [] };
}

// Frameworks report paths relative to where the dev server runs (`base` from the plugin), or absolute.
function repoRelative(ref: Ref, { root, base }: ClientConfig): Ref {
	const fix = (file: string) => {
		if (file.startsWith(root + '/')) return file.slice(root.length + 1);
		if (/^([a-zA-Z]:)?\//.test(file) || !base) return file;
		return `${base}/${file}`;
	};
	return {
		...ref,
		file: ref.file && fix(ref.file),
		chain: ref.chain.map((frame) => ({ ...frame, file: fix(frame.file) }))
	};
}
