import raw from 'virtual:pinprompt/config';
import { mount } from 'svelte';
import Overlay from './Overlay.svelte';
import type { ClientConfig } from './types.js';

const config = raw as ClientConfig;

// A shadow root keeps the app's styles and ours apart.
const host = document.createElement('pinprompt-root');
document.body.append(host);

// Events leaving the shadow root look like they come from <pinprompt-root>, not a text field,
// so the app's keyboard shortcuts would fire while typing a prompt. Keep them inside.
for (const type of ['keydown', 'keyup', 'keypress', 'input', 'beforeinput', 'paste']) {
	host.addEventListener(type, (e) => e.stopPropagation());
}
mount(Overlay, { target: host.attachShadow({ mode: 'open' }), props: { config, host } });
