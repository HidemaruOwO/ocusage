import { describe, expect, test } from 'bun:test';
import { formatCost, formatDuration, formatTable, formatTokens } from '../../../src/lib/formatter';

describe('formatter utilities', () => {
	test('formatTokens adds commas', () => {
		expect(formatTokens(1234567)).toBe('1,234,567');
		expect(formatTokens(1234.5)).toBe('1,234.5');
	});

	test('formatCost uses 4 decimals with $', () => {
		expect(formatCost(0.315)).toBe('$0.3150');
	});

	test('formatDuration appends min', () => {
		expect(formatDuration(75.5)).toBe('75.5min');
		expect(formatDuration(75)).toBe('75min');
	});

	test('formatTable joins by tabs and newlines', () => {
		const headers = ['A', 'B'];
		const rows = [
			['1', '2'],
			['3', '4'],
		];
		expect(formatTable(headers, rows)).toBe('A\tB\n1\t2\n3\t4');
	});
});
