/** Collapsed visible text, cut to `max` characters. */
export function visibleText(el: Element, max = 40) {
	const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
	return text.length > max ? text.slice(0, max - 1) + '…' : text;
}
