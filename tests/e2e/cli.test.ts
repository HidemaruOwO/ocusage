import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import type { PeriodJsonOutput, SessionsJsonOutput } from '../../src/lib/exporter';

type CliResult = {
	stdout: string;
	stderr: string;
	exitCode: number;
};

type SessionJsonOutput = {
	session: {
		id: string;
		models: string[];
		messages: Array<{
			index: number;
			role: string;
			time: string;
			tokens: {
				input: number;
				output: number;
				cache: number;
			} | null;
		}>;
		summary: {
			inputTokens: number;
			outputTokens: number;
			cacheTokens: number;
			costUSD: number;
		};
	};
};

const repoRoot = join(import.meta.dir, '..', '..');
const fixturesDir = join(repoRoot, 'tests', 'fixtures', 'messages');
const cliPath = join(repoRoot, 'src', 'index.ts');

const readStream = async (stream: ReadableStream | null): Promise<string> => {
	if (!stream) return '';
	return new Response(stream).text();
};

const runCli = async (args: string[]): Promise<CliResult> => {
	const proc = Bun.spawn({
		cmd: [process.execPath, cliPath, ...args],
		cwd: repoRoot,
		env: {
			...Bun.env,
			OPENROUTER_API_KEY: '',
			TZ: 'UTC',
		},
		stdout: 'pipe',
		stderr: 'pipe',
	});

	const stdout = await readStream(proc.stdout);
	const stderr = await readStream(proc.stderr);
	const exitCode = await proc.exited;

	return { stdout, stderr, exitCode };
};

const parseJson = <T>(text: string): T => JSON.parse(text) as T;

const totals = {
	inputTokens: 11500,
	outputTokens: 6000,
	cacheTokens: 2500,
	costUSD: 0.1289,
};

const session1Totals = {
	inputTokens: 6500,
	outputTokens: 3500,
	cacheTokens: 1000,
	costUSD: 0.058,
};

const session2Totals = {
	inputTokens: 5000,
	outputTokens: 2500,
	cacheTokens: 1500,
	costUSD: 0.0709,
};

describe('CLI commands (E2E)', () => {
	test('sessions command outputs JSON summary', async () => {
		const result = await runCli(['sessions', '--json', '--path', fixturesDir]);
		expect(result.exitCode).toBe(0);

		const payload = parseJson<SessionsJsonOutput>(result.stdout);
		expect(payload.sessions).toHaveLength(2);
		expect(payload.sessions[0]?.sessionId).toBe('ses_test-session-2');
		expect(payload.totals.inputTokens).toBe(totals.inputTokens);
		expect(payload.totals.outputTokens).toBe(totals.outputTokens);
		expect(payload.totals.cacheTokens).toBe(totals.cacheTokens);
		expect(payload.totals.costUSD).toBeCloseTo(totals.costUSD, 6);

		const session2 = payload.sessions[0];
		expect(session2.inputTokens).toBe(session2Totals.inputTokens);
		expect(session2.outputTokens).toBe(session2Totals.outputTokens);
		expect(session2.cacheTokens).toBe(session2Totals.cacheTokens);
		expect(session2.costUSD).toBeCloseTo(session2Totals.costUSD, 6);
		expect(Object.keys(session2.models).sort()).toEqual(['anthropic/claude-opus-4.5']);
	});

	test('session command outputs JSON details', async () => {
		const result = await runCli(['session', 'ses_test-session-1', '--json', '--path', fixturesDir]);
		expect(result.exitCode).toBe(0);

		const payload = parseJson<SessionJsonOutput>(result.stdout);
		expect(payload.session.id).toBe('ses_test-session-1');
		expect(payload.session.messages).toHaveLength(3);
		expect(payload.session.summary.inputTokens).toBe(session1Totals.inputTokens);
		expect(payload.session.summary.outputTokens).toBe(session1Totals.outputTokens);
		expect(payload.session.summary.cacheTokens).toBe(session1Totals.cacheTokens);
		expect(payload.session.summary.costUSD).toBeCloseTo(session1Totals.costUSD, 6);

		const models = [...payload.session.models].sort();
		expect(models).toEqual(['anthropic/claude-3.5-sonnet', 'gpt-4o'].sort());
		const firstTokens = payload.session.messages[0]?.tokens;
		expect(firstTokens).toEqual({
			input: 1500,
			output: 800,
			cache: 300,
		});
	});

	test('models command outputs JSON summary', async () => {
		const result = await runCli(['models', '--json', '--path', fixturesDir]);
		expect(result.exitCode).toBe(0);

		const payload = parseJson<{
			models: Array<{
				model: string;
				inputTokens: number;
				outputTokens: number;
				cacheTokens: number;
				costUSD: number;
			}>;
			totals: typeof totals;
		}>(result.stdout);
		expect(payload.models).toHaveLength(3);
		expect(payload.totals.inputTokens).toBe(totals.inputTokens);
		expect(payload.totals.outputTokens).toBe(totals.outputTokens);
		expect(payload.totals.cacheTokens).toBe(totals.cacheTokens);
		expect(payload.totals.costUSD).toBeCloseTo(totals.costUSD, 6);

		const gpt4o = payload.models.find((model) => model.model === 'gpt-4o');
		expect(gpt4o).not.toBeUndefined();
		if (!gpt4o) return;
		expect(gpt4o.inputTokens).toBe(2000);
		expect(gpt4o.outputTokens).toBe(1200);
		expect(gpt4o.cacheTokens).toBe(0);
		expect(gpt4o.costUSD).toBeCloseTo(0.017, 6);
	});

	test('daily command outputs JSON summary', async () => {
		const result = await runCli(['daily', '--json', '--path', fixturesDir]);
		expect(result.exitCode).toBe(0);

		const payload = parseJson<PeriodJsonOutput>(result.stdout);
		const daily = payload.daily ?? [];
		expect(daily).toHaveLength(2);

		const first = daily[0];
		expect(first?.date).toBe('Jan 1, 2024');
		expect(first?.sessions).toBe(1);
		expect(first?.inputTokens).toBe(session1Totals.inputTokens);
		expect(first?.outputTokens).toBe(session1Totals.outputTokens);
		expect(first?.cacheTokens).toBe(session1Totals.cacheTokens);
		expect(first?.costUSD).toBeCloseTo(session1Totals.costUSD, 6);
		expect([...(first?.models ?? [])].sort()).toEqual(
			['anthropic/claude-3.5-sonnet', 'gpt-4o'].sort(),
		);

		const second = daily[1];
		expect(second?.date).toBe('Jan 2, 2024');
		expect(second?.sessions).toBe(1);
		expect(second?.inputTokens).toBe(session2Totals.inputTokens);
		expect(second?.outputTokens).toBe(session2Totals.outputTokens);
		expect(second?.cacheTokens).toBe(session2Totals.cacheTokens);
		expect(second?.costUSD).toBeCloseTo(session2Totals.costUSD, 6);
		expect(second?.models).toEqual(['anthropic/claude-opus-4.5']);
	});

	test('weekly command outputs JSON summary', async () => {
		const result = await runCli(['weekly', '--json', '--path', fixturesDir]);
		expect(result.exitCode).toBe(0);

		const payload = parseJson<PeriodJsonOutput>(result.stdout);
		const weekly = payload.weekly ?? [];
		expect(weekly).toHaveLength(1);

		const row = weekly[0];
		expect(row?.week).toBe('2024-W01');
		expect(row?.sessions).toBe(2);
		expect(row?.inputTokens).toBe(totals.inputTokens);
		expect(row?.outputTokens).toBe(totals.outputTokens);
		expect(row?.cacheTokens).toBe(totals.cacheTokens);
		expect(row?.costUSD).toBeCloseTo(totals.costUSD, 6);
		const models = [...(row?.models ?? [])].sort();
		expect(models).toEqual(
			['anthropic/claude-3.5-sonnet', 'anthropic/claude-opus-4.5', 'gpt-4o'].sort(),
		);
		if (payload.totals) {
			expect(payload.totals.costUSD).toBeCloseTo(totals.costUSD, 6);
		}
	});

	test('monthly command outputs JSON summary', async () => {
		const result = await runCli(['monthly', '--json', '--path', fixturesDir]);
		expect(result.exitCode).toBe(0);

		const payload = parseJson<PeriodJsonOutput>(result.stdout);
		const monthly = payload.monthly ?? [];
		expect(monthly).toHaveLength(1);

		const row = monthly[0];
		expect(row?.month).toBe('2024-01');
		expect(row?.sessions).toBe(2);
		expect(row?.inputTokens).toBe(totals.inputTokens);
		expect(row?.outputTokens).toBe(totals.outputTokens);
		expect(row?.cacheTokens).toBe(totals.cacheTokens);
		expect(row?.costUSD).toBeCloseTo(totals.costUSD, 6);
	});
});
