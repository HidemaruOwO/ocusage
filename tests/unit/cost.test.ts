import { describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Message } from '../../src/models/message';
import type { ModelConfigMap } from '../../src/models/model';
import type { TokenUsage } from '../../src/models/message';
import {
	calculateMessageCost,
	calculateUsageCost,
	loadModelConfigs,
} from '../../src/services/cost';

const createTempDir = async (): Promise<string> => {
	return mkdtemp(join(tmpdir(), 'ocusage-cost-'));
};

const baseConfig: ModelConfigMap = {
	'model-a': {
		inputCostPerMillion: 10,
		outputCostPerMillion: 20,
		cacheCostPerMillion: 5,
		contextWindow: 1000,
		description: 'Model A',
	},
};

describe('cost calculator', () => {
	test('calculateUsageCost computes costs with cache override', () => {
		const tokens: TokenUsage = {
			input: 1000,
			output: 2000,
			reasoning: 0,
			cache: {
				read: 300,
				write: 700,
			},
		};

		const usage = calculateUsageCost(tokens, 'model-a', baseConfig);
		expect(usage.inputTokens).toBe(1000);
		expect(usage.outputTokens).toBe(2000);
		expect(usage.cacheTokens).toBe(1000);
		expect(usage.inputCost).toBeCloseTo(0.01, 6);
		expect(usage.outputCost).toBeCloseTo(0.04, 6);
		expect(usage.cacheCost).toBeCloseTo(0.005, 6);
		expect(usage.totalCost).toBeCloseTo(0.055, 6);
	});

	test('calculateUsageCost falls back to input cost for cache', () => {
		const configs: ModelConfigMap = {
			'model-b': {
				inputCostPerMillion: 8,
				outputCostPerMillion: 16,
				contextWindow: 1000,
				description: 'Model B',
			},
		};

		const tokens: TokenUsage = {
			input: 0,
			output: 0,
			reasoning: 0,
			cache: {
				read: 400,
				write: 600,
			},
		};

		const usage = calculateUsageCost(tokens, 'model-b', configs);
		expect(usage.cacheCost).toBeCloseTo(0.008, 6);
		expect(usage.totalCost).toBeCloseTo(0.008, 6);
	});

	test('calculateMessageCost returns empty usage without tokens', () => {
		const message: Message = {
			id: 'msg_1',
			sessionID: 'ses_1',
			role: 'user',
			time: {
				created: 1_700_000_000_000,
			},
			modelID: 'model-a',
			providerID: 'provider',
			cost: 0,
		};

		const usage = calculateMessageCost(message, baseConfig);
		expect(usage.totalCost).toBe(0);
		expect(usage.inputTokens).toBe(0);
	});

	test('loadModelConfigs returns empty config when missing file', async () => {
		const missingPath = join(tmpdir(), `ocusage-missing-${crypto.randomUUID()}.json`);
		const configs = await loadModelConfigs(missingPath);
		expect(Object.keys(configs).length).toBe(0);
	});

	test('loadModelConfigs parses snake_case config file', async () => {
		const dir = await createTempDir();
		const filePath = join(dir, 'models.json');

		try {
			await Bun.write(
				filePath,
				JSON.stringify({
					'model-c': {
						input_cost_per_million: 1,
						output_cost_per_million: 2,
						cache_cost_per_million: 0.5,
						context_window: 500,
						description: 'Model C',
					},
				}),
			);

			const configs = await loadModelConfigs(filePath);
			expect(configs['model-c']?.inputCostPerMillion).toBe(1);
			expect(configs['model-c']?.outputCostPerMillion).toBe(2);
			expect(configs['model-c']?.cacheCostPerMillion).toBe(0.5);
			expect(configs['model-c']?.contextWindow).toBe(500);
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});
});
