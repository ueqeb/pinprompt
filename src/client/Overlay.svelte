<script lang="ts">
	import type { Ref } from '../types.js';
	import { deliver } from './deliver.js';
	import { load, save } from './draft.js';
	import { toIntent, widen } from './intent.js';
	import { startPicking } from './picker.js';
	import { resolve } from './resolve.js';
	import type { ClientConfig } from './types.js';

	let { config, host }: { config: ClientConfig; host: Element } = $props();

	// `el` is missing for picks restored after a reload: the ref survives, the element doesn't.
	type Pick = { n: number; el?: Element; ref: Ref };

	const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
	const color = (n: number) => colors[(n - 1) % colors.length];

	// The draft survives reloads, which are constant while an AI edits the code.
	const draft = load();
	let open = $state(draft.open);
	let text = $state(draft.text);
	let picks = $state.raw<Pick[]>(draft.refs.map(([n, ref]) => ({ n, ref })));
	let output = $state(draft.output);
	let hovered = $state.raw<Element | null>(null);
	let depth = $state(0);
	let status = $state('');
	let failed = $state(false);
	let frame = $state(0);
	let textarea = $state<HTMLTextAreaElement>();
	let result = $state<HTMLButtonElement>();

	const target = $derived(hovered && widen(hovered, depth));
	const targetRef = $derived(target && resolve(target, config));
	const used = $derived(picks.filter((p) => text.includes(`[${p.n}]`)));

	$effect(() => save({ open, text, refs: used.map((p) => [p.n, p.ref]), output }));

	// Alt+P (Option+P on macOS) toggles the bar. `code` ignores the character the key would type.
	$effect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyP') {
				e.preventDefault();
				toggle();
			} else if (e.key === 'Escape' && output && e.composedPath().includes(host)) {
				// Esc from inside the overlay (result text or buttons) dismisses the result.
				e.preventDefault();
				dismiss();
			}
		};
		window.addEventListener('keydown', onKey, true);
		return () => window.removeEventListener('keydown', onKey, true);
	});

	// Picking only while composing; a shown result pauses it.
	$effect(() => {
		if (!open || output) return;
		textarea?.focus();
		const stop = startPicking(host, {
			hover(el) {
				if (el !== hovered) depth = 0;
				hovered = el;
			},
			pick(el) {
				add(el === hovered && target ? target : el);
			}
		});
		// Keep outlines on their elements while the page scrolls, resizes or re-renders.
		let id = requestAnimationFrame(function tick() {
			frame++;
			id = requestAnimationFrame(tick);
		});
		return () => {
			stop();
			cancelAnimationFrame(id);
		};
	});

	function toggle() {
		open = !open;
		status = '';
	}

	function add(el: Element) {
		let pick = picks.find((p) => p.el === el);
		if (!pick) {
			pick = { n: Math.max(0, ...picks.map((p) => p.n)) + 1, el, ref: resolve(el, config) };
			picks = [...picks, pick];
		}
		insert(`[${pick.n}]`);
	}

	// Inserts at the cursor, with a space before it so markers don't glue to words.
	function insert(marker: string) {
		const area = textarea!;
		const start = area.selectionStart;
		const before = text.slice(0, start);
		const after = text.slice(area.selectionEnd);
		const value = (before && !/\s$/.test(before) ? ' ' : '') + marker;
		text = before + value + after;
		const caret = before.length + value.length;
		requestAnimationFrame(() => {
			area.focus();
			area.setSelectionRange(caret, caret);
		});
	}

	async function submit() {
		if (!text.trim()) return;
		const intent = toIntent(text, new Map(picks.map((p) => [p.n, p.ref])));
		output = config.target.render(intent, { root: config.root });
		text = '';
		picks = [];
		await copy();
		result?.focus();
	}

	async function copy() {
		try {
			await deliver(output, config.target);
			status = `Copied for ${config.target.name}`;
			failed = false;
		} catch (error) {
			status = `Couldn't copy (${(error as Error).message}). Select the text and copy it by hand.`;
			failed = true;
		}
	}

	function dismiss() {
		output = '';
		status = '';
	}

	function onKeydown(e: KeyboardEvent) {
		// Enter while an input method (Japanese, Chinese...) is composing confirms the text, not the prompt.
		if (e.isComposing || e.keyCode === 229) return;
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			submit();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			open = false;
		} else if (hovered && e.key === 'ArrowUp') {
			e.preventDefault();
			if (widen(hovered, depth + 1) !== target) depth++;
		} else if (hovered && e.key === 'ArrowDown') {
			e.preventDefault();
			depth = Math.max(0, depth - 1);
		}
	}

	function box(el: Element) {
		frame;
		const r = el.getBoundingClientRect();
		return `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;
	}

	function label(ref: Ref) {
		const component = ref.chain.find((f) => f.kind === 'component')?.name;
		const name = component ? `${component} <${ref.tag}>` : `<${ref.tag}>`;
		const text = ref.text.length > 24 ? ref.text.slice(0, 23) + '…' : ref.text;
		return text ? `${name} "${text}"` : name;
	}

	const where = (ref: Ref) => (ref.file ? `${ref.file.split('/').pop()}:${ref.line}` : 'no source');
</script>

{#if open}
	{#each used as pick (pick.n)}
		{#if pick.el?.isConnected}
			<div class="box picked" style="{box(pick.el)};--c:{color(pick.n)}">
				<span class="tag">{pick.n}</span>
			</div>
		{/if}
	{/each}

	{#if target && targetRef}
		<div class="box hover" style={box(target)}>
			<span class="tag">{label(targetRef)} · {where(targetRef)}</span>
		</div>
	{/if}

	<div class="bar">
		{#if used.length}
			<ul class="refs">
				{#each used as pick (pick.n)}
					<li style="--c:{color(pick.n)}"><b>{pick.n}</b> {label(pick.ref)}</li>
				{/each}
			</ul>
		{/if}
		{#if output}
			<!-- Selectable: copy just part of it with ⌘C/Ctrl+C. -->
			<!-- Focusable so Esc still reaches the overlay after clicking into the text. -->
			<pre class="output" tabindex="-1" oncopy={() => ((status = 'Copied selection'), (failed = false))}>{output}</pre>
			<div class="hint">
				<span><span class="status" class:failed>{status || 'Copied'}</span> · select to copy part · Esc dismiss</span>
				<span class="actions">
					<button bind:this={result} class="copy" onclick={copy}>Copy all</button>
					<button class="dismiss" onclick={dismiss} title="Dismiss">✕</button>
				</span>
			</div>
		{:else}
			<textarea
				bind:this={textarea}
				bind:value={text}
				onkeydown={onKeydown}
				rows="2"
				placeholder="Type what you want, click elements to reference them…"
			></textarea>
			<div class="hint">
				<span>Click to reference · ↑↓ parent/child · Enter copy · Esc close</span>
				<span>{config.target.name}</span>
			</div>
		{/if}
	</div>
{:else}
	<button class="launcher" onclick={toggle} title="pinprompt (Alt+P)">pinprompt</button>
{/if}

<style>
	* {
		box-sizing: border-box;
	}
	.box {
		position: fixed;
		z-index: 2147483646;
		pointer-events: none;
		border-radius: 3px;
	}
	.hover {
		outline: 2px dashed #3b82f6;
		background: rgb(59 130 246 / 0.08);
	}
	.picked {
		outline: 2px solid var(--c);
	}
	.tag {
		position: absolute;
		left: -2px;
		bottom: 100%;
		padding: 1px 6px;
		border-radius: 3px 3px 0 0;
		background: var(--c, #3b82f6);
		color: #fff;
		font: 600 11px/1.5 ui-monospace, monospace;
		white-space: nowrap;
	}
	.bar {
		position: fixed;
		z-index: 2147483647;
		left: 50%;
		bottom: 16px;
		width: min(640px, calc(100vw - 32px));
		transform: translateX(-50%);
		padding: 8px;
		border-radius: 10px;
		background: #18181b;
		color: #fafafa;
		box-shadow: 0 8px 30px rgb(0 0 0 / 0.35);
		font: 13px/1.4 system-ui, sans-serif;
	}
	.refs {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		margin: 0 0 6px;
		padding: 0;
		list-style: none;
	}
	.refs li {
		padding: 1px 6px;
		border-left: 3px solid var(--c);
		border-radius: 3px;
		background: #27272a;
		font-size: 12px;
	}
	textarea {
		display: block;
		width: 100%;
		resize: none;
		padding: 6px 8px;
		border: 1px solid #3f3f46;
		border-radius: 6px;
		background: #09090b;
		color: inherit;
		font: 14px/1.4 ui-monospace, monospace;
		outline: none;
	}
	textarea:focus {
		border-color: #3b82f6;
	}
	.hint {
		display: flex;
		justify-content: space-between;
		margin-top: 4px;
		color: #a1a1aa;
		font-size: 11px;
	}
	.status {
		color: #4ade80;
	}
	.status.failed {
		color: #f87171;
	}
	.output {
		max-height: 40vh;
		overflow: auto;
		margin: 0;
		padding: 6px 8px;
		border: 1px solid #3f3f46;
		border-radius: 6px;
		background: #09090b;
		font: 12px/1.45 ui-monospace, monospace;
		white-space: pre-wrap;
		word-break: break-word;
		user-select: text;
		cursor: text;
		outline: none;
	}
	.actions {
		display: flex;
		gap: 6px;
		align-items: center;
	}
	.copy {
		padding: 1px 8px;
		border: 1px solid #3f3f46;
		border-radius: 4px;
		background: #27272a;
		color: #fafafa;
		font: inherit;
		cursor: pointer;
	}
	.copy:hover,
	.copy:focus-visible {
		border-color: #3b82f6;
		outline: none;
	}
	.dismiss {
		padding: 0 4px;
		border: 0;
		background: none;
		color: inherit;
		font: inherit;
		cursor: pointer;
	}
	.dismiss:hover {
		color: #fafafa;
	}
	.launcher {
		position: fixed;
		z-index: 2147483647;
		right: 12px;
		bottom: 12px;
		padding: 4px 10px;
		border: 0;
		border-radius: 6px;
		background: #18181b;
		color: #fafafa;
		font: 12px/1.4 system-ui, sans-serif;
		cursor: pointer;
		opacity: 0.6;
	}
	.launcher:hover {
		opacity: 1;
	}
</style>
