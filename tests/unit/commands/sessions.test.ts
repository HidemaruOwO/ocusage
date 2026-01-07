import { describe, expect, test } from 'bun:test';
import { filterSessions, resolveOutputFormat, sortSessions } from '../../../src/commands/sessions';
import type { Session } from '../../../src/models/session';

const createSession = (overrides: Partial<Session>): Session => {
	return {
		id: 'ses_default',
		startTime: new Date(2025, 0, 1, 0, 0, 0).getTime(),
		endTime: new Date(2025, 0, 1, 0, 10, 0).getTime(),
		models: {
			'model-a': {
				inputTokens: 10,
				outputTokens: 5,
				cacheTokens: 2,
				costUSD: 0.17,
			},
		},
		messages: [],
		usage: {
			inputTokens: 10,
			outputTokens: 5,
			cacheTokens: 2,
			inputCost: 0.1,
			outputCost: 0.05,
			cacheCost: 0.02,
			totalCost: 0.17,
		},
		...overrides,
	};
};

describe('sessions command helpers', () => {
	test('filterSessions filters by date range and model', () => {
		const sessionA = createSession({
			id: 'ses_a',
			startTime: new Date(2025, 0, 1, 0, 0, 0).getTime(),
		});
		const sessionB = createSession({
			id: 'ses_b',
			startTime: new Date(2025, 0, 2, 0, 0, 0).getTime(),
		});
		const sessionC = createSession({
			id: 'ses_c',
			startTime: new Date(2025, 0, 2, 0, 0, 0).getTime(),
			models: {
				'model-b': {
					inputTokens: 10,
					outputTokens: 5,
					cacheTokens: 2,
					costUSD: 0.17,
				},
			},
		});

		const fromTime = new Date(2025, 0, 2, 0, 0, 0).getTime();
		const toTime = new Date(2025, 0, 2, 23, 59, 59, 999).getTime();
		const filtered = filterSessions([sessionA, sessionB, sessionC], {
			from: fromTime,
			to: toTime,
			model: 'model-a',
		});

		expect(filtered.map((session) => session.id)).toEqual(['ses_b']);
	});

	test('sortSessions sorts by cost in descending order', () => {
		const sessionA = createSession({
			id: 'ses_a',
			usage: {
				inputTokens: 1,
				outputTokens: 1,
				cacheTokens: 0,
				inputCost: 0.1,
				outputCost: 0,
				cacheCost: 0,
				totalCost: 0.1,
			},
		});
		const sessionB = createSession({
			id: 'ses_b',
			usage: {
				inputTokens: 1,
				outputTokens: 1,
				cacheTokens: 0,
				inputCost: 0.4,
				outputCost: 0,
				cacheCost: 0,
				totalCost: 0.4,
			},
		});

		const sorted = sortSessions([sessionA, sessionB], 'cost', 'desc');
		expect(sorted.map((session) => session.id)).toEqual(['ses_b', 'ses_a']);
	});

	test('sortSessions sorts by tokens in ascending order', () => {
		const sessionA = createSession({
			id: 'ses_a',
			usage: {
				inputTokens: 10,
				outputTokens: 10,
				cacheTokens: 5,
				inputCost: 0,
				outputCost: 0,
				cacheCost: 0,
				totalCost: 0,
			},
		});
		const sessionB = createSession({
			id: 'ses_b',
			usage: {
				inputTokens: 1,
				outputTokens: 1,
				cacheTokens: 0,
				inputCost: 0,
				outputCost: 0,
				cacheCost: 0,
				totalCost: 0,
			},
		});

		const sorted = sortSessions([sessionA, sessionB], 'tokens', 'asc');
		expect(sorted.map((session) => session.id)).toEqual(['ses_b', 'ses_a']);
	});

	test('resolveOutputFormat selects json when --json is set', () => {
		expect(resolveOutputFormat({ json: true })).toBe('json');
	});

	test('resolveOutputFormat selects csv when --csv is set', () => {
		expect(resolveOutputFormat({ csv: true })).toBe('csv');
	});

	test('resolveOutputFormat returns null when both --json and --csv are set', () => {
		expect(resolveOutputFormat({ json: true, csv: true })).toBeNull();
	});
});
