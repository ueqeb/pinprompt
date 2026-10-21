// `npx pinprompt init`: the pure parts, kept free of I/O so they can be tested.

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

export const LOCKFILES: [string, PackageManager][] = [
	['pnpm-lock.yaml', 'pnpm'],
	['yarn.lock', 'yarn'],
	['bun.lock', 'bun'],
	['bun.lockb', 'bun'],
	['package-lock.json', 'npm']
];

/** The project's lockfile wins; otherwise whatever ran `npx`/`pnpm dlx`/...; otherwise npm. */
export function detectPackageManager(files: string[], userAgent = ''): PackageManager {
	for (const [file, pm] of LOCKFILES) if (files.includes(file)) return pm;
	const fromAgent = userAgent.split('/')[0];
	return (['pnpm', 'yarn', 'bun'] as const).find((pm) => pm === fromAgent) ?? 'npm';
}

/** `spec` pins the version, e.g. `pinprompt@0.0.1`, so init installs what's running. */
export function installCommand(pm: PackageManager, spec = 'pinprompt'): [string, string[]] {
	if (pm === 'npm') return ['npm', ['install', '-D', spec]];
	return [pm, ['add', pm === 'bun' ? '-d' : '-D', spec]];
}

/**
 * Adds the import and `pinprompt()` to a Vite config. Returns `null` unless the config has
 * exactly one `plugins` in its code, as a top-level `plugins: [...]` key: never guess.
 */
export function addPlugin(source: string): string | null {
	const code = codeOnly(source);
	if (code === null) return null;
	if (/\bpinprompt\b/.test(code)) return source;

	const uses = [...code.matchAll(/\bplugins\b/g)];
	if (uses.length !== 1) return null;
	const at = uses[0].index!;
	const key = /plugins\s*:\s*\[/y;
	key.lastIndex = at;
	const hit = key.exec(code);
	if (!hit || depth(code.slice(0, at), '{', '}') !== 1) return null;

	const open = at + hit[0].length - 1;
	const close = matchingBracket(code, open);
	if (close === -1) return null;

	const inner = code.slice(open + 1, close);
	const end = open + 1 + inner.trimEnd().length; // right after the last code character
	if (end === open + 1) return addImport(source.slice(0, end) + 'pinprompt()' + source.slice(end));

	const trailingComma = code[end - 1] === ',';
	const newline = source.indexOf('\n', end);
	let edited: string;
	if (newline !== -1 && newline < close) {
		// Multi-line: comma right after the code (before any trailing comment),
		// new element on its own line, indented like the last one.
		const lineStart = source.lastIndexOf('\n', end - 1) + 1;
		const indent = /^[ \t]*/.exec(source.slice(lineStart))![0];
		edited =
			source.slice(0, end) +
			(trailingComma ? '' : ',') +
			source.slice(end, newline) +
			`\n${indent}pinprompt()${trailingComma ? ',' : ''}` +
			source.slice(newline);
	} else {
		edited = source.slice(0, end) + (trailingComma ? ' ' : ', ') + 'pinprompt()' + source.slice(end);
	}
	return addImport(edited);
}

function addImport(source: string) {
	const imports = [...source.matchAll(/^import\s[^;]*?from\s*(['"])[^'"]+\1(;?)[ \t]*$/gm)];
	const last = imports.at(-1);
	const quote = last?.[1] ?? "'";
	const semi = last ? last[2] : ';';
	const line = `import { pinprompt } from ${quote}pinprompt/vite${quote}${semi}`;
	if (!last) return `${line}\n${source}`;
	const end = last.index! + last[0].length;
	return `${source.slice(0, end)}\n${line}${source.slice(end)}`;
}

/**
 * Same length as `source`, with comments and the contents of strings and regex literals
 * blanked out, so searches and bracket counting only see code. `null` if unterminated.
 */
function codeOnly(source: string): string | null {
	const out = source.split('');
	const blank = (from: number, to: number) => {
		for (let k = from; k < to; k++) if (out[k] !== '\n') out[k] = ' ';
	};
	for (let i = 0; i < source.length; i++) {
		const c = source[i];
		if (c === '"' || c === "'" || c === '`') {
			let j = i + 1;
			for (; j < source.length && source[j] !== c; j++) if (source[j] === '\\') j++;
			if (j >= source.length) return null;
			blank(i + 1, j);
			i = j;
		} else if (c === '/' && source[i + 1] === '/') {
			const j = source.indexOf('\n', i);
			blank(i, j === -1 ? source.length : j);
			i = j === -1 ? source.length : j;
		} else if (c === '/' && source[i + 1] === '*') {
			const j = source.indexOf('*/', i + 2);
			if (j === -1) return null;
			blank(i, j + 2);
			i = j + 1;
		} else if (c === '/' && /(^|[(,=:[!&|?{};])\s*$/.test(source.slice(Math.max(0, i - 20), i))) {
			// Regex literal, including character classes like [/\]].
			let j = i + 1;
			for (let inClass = false; j < source.length && source[j] !== '\n'; j++) {
				if (source[j] === '\\') j++;
				else if (source[j] === '[') inClass = true;
				else if (source[j] === ']') inClass = false;
				else if (source[j] === '/' && !inClass) break;
			}
			if (source[j] !== '/') return null;
			blank(i + 1, j);
			i = j;
		}
	}
	return out.join('');
}

const depth = (code: string, open: string, close: string) =>
	code.split(open).length - code.split(close).length;

// Index of the bracket closing the one at `open`, in code-only text.
function matchingBracket(code: string, open: number) {
	let level = 0;
	for (let i = open; i < code.length; i++) {
		if ('([{'.includes(code[i])) level++;
		else if (')]}'.includes(code[i]) && --level === 0) return code[i] === ']' ? i : -1;
	}
	return -1;
}
