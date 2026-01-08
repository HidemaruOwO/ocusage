import { describe, expect, test } from 'bun:test';
import { createSpinner } from '../../src/lib/spinner';

describe('createSpinner', () => {
	test('returns silent spinner that is no-op', () => {
		const spinner = createSpinner('Processing', true);
		expect(spinner.text).toBe('Processing');

		const started = spinner.start('Working...');
		expect(started).toBe(spinner);
		expect(spinner.text).toBe('Working...');

		const succeeded = spinner.succeed('Done');
		expect(succeeded).toBe(spinner);
		expect(spinner.text).toBe('Done');

		const stopped = spinner.stop();
		expect(stopped).toBe(spinner);
	});
});
