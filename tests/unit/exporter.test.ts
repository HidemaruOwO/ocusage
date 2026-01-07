import { describe, expect, test } from 'bun:test';
import type {
	PeriodExportData,
	PeriodJsonOutput,
	SessionExportData,
	SessionsJsonOutput,
} from '../../src/lib/exporter';
import {
	formatAsCsv,
	formatPeriodAsJson,
	formatSessionsAsJson,
	getModelNamesForCsv,
} from '../../src/lib/exporter';

describe('exporter utilities', () => {
	test('formatAsCsv outputs basic CSV', () => {
		const headers = ['session_id', 'input_tokens'];
		const rows = [['ses_1', 1200]];

		expect(formatAsCsv(headers, rows)).toBe('session_id,input_tokens\nses_1,1200');
	});

	test('formatAsCsv quotes strings with commas', () => {
		const headers = ['session_id', 'model'];
		const rows = [['ses_1', 'model,a']];

		expect(formatAsCsv(headers, rows)).toBe('session_id,model\nses_1,"model,a"');
	});

	test('formatAsCsv handles empty arrays', () => {
		expect(formatAsCsv([], [])).toBe('');
	});

	test('getModelNamesForCsv joins model keys', () => {
		const models = {
			'gpt-4': {
				inputTokens: 1,
				outputTokens: 2,
				cacheTokens: 0,
				costUSD: 0.01,
			},
			'gpt-4o': {
				inputTokens: 3,
				outputTokens: 4,
				cacheTokens: 1,
				costUSD: 0.02,
			},
		};

		expect(getModelNamesForCsv(models)).toBe('gpt-4,gpt-4o');
	});

	test('formatPeriodAsJson outputs models and totals', () => {
		const periods: PeriodExportData[] = [
			{
				period: '2026-01-01',
				sessions: 2,
				models: ['gpt-4', 'gpt-4o'],
				inputTokens: 10,
				outputTokens: 5,
				cacheTokens: 0,
				costUSD: 0.1,
			},
		];

		const result = JSON.parse(formatPeriodAsJson(periods, 'daily')) as PeriodJsonOutput;

		expect(result.daily).toEqual([
			{
				date: '2026-01-01',
				sessions: 2,
				models: ['gpt-4', 'gpt-4o'],
				inputTokens: 10,
				outputTokens: 5,
				cacheTokens: 0,
				costUSD: 0.1,
			},
		]);
		expect(result.totals).toEqual({
			sessions: 2,
			inputTokens: 10,
			outputTokens: 5,
			cacheTokens: 0,
			costUSD: 0.1,
		});
	});

	test('formatSessionsAsJson outputs sessions and totals', () => {
		const sessions: SessionExportData[] = [
			{
				sessionId: 'ses_1',
				date: 'Jan 1, 2026',
				startTime: '10:00:00',
				endTime: '10:30:00',
				durationMinutes: 30,
				models: {
					'gpt-4': {
						inputTokens: 1200,
						outputTokens: 800,
						cacheTokens: 0,
						costUSD: 0.315,
					},
				},
				inputTokens: 1200,
				outputTokens: 800,
				cacheTokens: 0,
				costUSD: 0.315,
			},
			{
				sessionId: 'ses_2',
				date: 'Jan 2, 2026',
				startTime: '11:00:00',
				endTime: '11:15:00',
				durationMinutes: 15,
				models: {
					'gpt-4': {
						inputTokens: 400,
						outputTokens: 600,
						cacheTokens: 100,
						costUSD: 0.2,
					},
				},
				inputTokens: 400,
				outputTokens: 600,
				cacheTokens: 100,
				costUSD: 0.2,
			},
		];

		const result = JSON.parse(formatSessionsAsJson(sessions)) as SessionsJsonOutput;

		expect(result.sessions).toEqual(sessions);
		expect(result.totals.inputTokens).toBe(1600);
		expect(result.totals.outputTokens).toBe(1400);
		expect(result.totals.cacheTokens).toBe(100);
		expect(result.totals.costUSD).toBeCloseTo(0.515, 6);
	});

	test('formatSessionsAsJson handles empty arrays', () => {
		const result = JSON.parse(formatSessionsAsJson([])) as SessionsJsonOutput;

		expect(result.sessions).toEqual([]);
		expect(result.totals).toEqual({
			inputTokens: 0,
			outputTokens: 0,
			cacheTokens: 0,
			costUSD: 0,
		});
	});
});
