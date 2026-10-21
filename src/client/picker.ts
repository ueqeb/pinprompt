type Handlers = {
	hover(el: Element | null): void;
	pick(el: Element): void;
};

/** While active, the page is inert: pointer events pick elements instead of reaching the app. */
export function startPicking(host: Element, { hover, pick }: Handlers) {
	const onPage = (e: Event) => !e.composedPath().includes(host);
	const elementOf = (e: Event) =>
		e.composedPath().find((node): node is Element => node instanceof Element) ?? null;

	const onMove = (e: Event) => hover(onPage(e) ? elementOf(e) : null);
	const block = (e: Event) => {
		if (!onPage(e)) return;
		e.preventDefault();
		e.stopPropagation();
	};
	const onClick = (e: Event) => {
		if (!onPage(e)) return;
		block(e);
		const el = elementOf(e);
		if (el) pick(el);
	};

	const listeners: [string, (e: Event) => void][] = [
		['pointermove', onMove],
		['pointerdown', block],
		['mousedown', block],
		['pointerup', block],
		['mouseup', block],
		['click', onClick],
		['dblclick', block],
		['auxclick', block],
		['contextmenu', block]
	];
	for (const [type, fn] of listeners) window.addEventListener(type, fn, true);
	return () => {
		for (const [type, fn] of listeners) window.removeEventListener(type, fn, true);
		hover(null);
	};
}
