import { expect, test } from 'vitest';
import target from './claude-code.js';
import { fixtures } from './fixtures.js';

for (const [name, intent] of Object.entries(fixtures)) {
	test(name, () => {
		expect(target.render(intent, { root: '/repo' })).toMatchSnapshot();
	});
}
