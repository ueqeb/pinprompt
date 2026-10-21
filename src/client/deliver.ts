import type { Target } from '../targets/types.js';

/** The target's own channel if it has one, otherwise the clipboard. */
export async function deliver(text: string, target: Target) {
	if (target.deliver) return target.deliver(text);
	try {
		await navigator.clipboard.writeText(text);
	} catch {
		// The Clipboard API needs a secure context; dev servers on a LAN IP over http aren't.
		const area = document.createElement('textarea');
		area.value = text;
		document.body.append(area);
		area.select();
		const copied = document.execCommand('copy');
		area.remove();
		if (!copied) throw new Error('the clipboard is not available here');
	}
}
