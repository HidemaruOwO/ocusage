import { afterAll, beforeEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Message, TokenUsage } from '../../src/models/message';
import type { ModelConfigMap } from '../../src/models/model';
import {
	calculateMessageCost,
	calculateUsageCost,
	clearUnknownModels,
	getUnknownModels,
	loadAllModelConfigs,
	loadModelConfigs,
	loadModelConfigsFromDir,
	resolveUnknownModelsFromOpenRouter,
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

const minimaxConfig = {
	inputCostPerMillion: 1,
	outputCostPerMillion: 2,
	contextWindow: 8000,
	description: 'Minimax M2.1',
};

const originalOpenRouterKey = Bun.env.OPENROUTER_API_KEY;

beforeEach(() => {
	Bun.env.OPENROUTER_API_KEY = '';
});

afterAll(() => {
	if (originalOpenRouterKey === undefined) {
		delete Bun.env.OPENROUTER_API_KEY;
		return;
	}

	Bun.env.OPENROUTER_API_KEY = originalOpenRouterKey;
});

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

	test('calculateUsageCost uses fuzzy matching for known variants', () => {
		const configs: ModelConfigMap = {
			'gpt-5.2': {
				inputCostPerMillion: 12,
				outputCostPerMillion: 18,
				contextWindow: 1000,
				description: 'GPT 5.2',
			},
			'gpt-5': {
				inputCostPerMillion: 11,
				outputCostPerMillion: 17,
				contextWindow: 1000,
				description: 'GPT 5',
			},
			'gpt-4o': {
				inputCostPerMillion: 9,
				outputCostPerMillion: 15,
				contextWindow: 1000,
				description: 'GPT 4o',
			},
			'claude-opus-4-5-20251101': {
				inputCostPerMillion: 20,
				outputCostPerMillion: 30,
				contextWindow: 1000,
				description: 'Claude Opus 4.5',
			},
			'claude-sonnet-4-20250514': {
				inputCostPerMillion: 14,
				outputCostPerMillion: 21,
				contextWindow: 1000,
				description: 'Claude Sonnet 4',
			},
		};

		const tokens: TokenUsage = {
			input: 1_000_000,
			output: 0,
			reasoning: 0,
			cache: {
				read: 0,
				write: 0,
			},
		};

		const gptUsage = calculateUsageCost(tokens, 'gpt-5.2-high', configs);
		expect(gptUsage.inputCost).toBeCloseTo(12, 6);

		const opusUsage = calculateUsageCost(tokens, 'anthropic/claude-opus-4.5', configs);
		expect(opusUsage.inputCost).toBeCloseTo(20, 6);

		const sonnetUsage = calculateUsageCost(tokens, 'claude-sonnet-4', configs);
		expect(sonnetUsage.inputCost).toBeCloseTo(14, 6);
	});

	test('calculateUsageCost falls back to gpt-4o for gpt variants', () => {
		const configs: ModelConfigMap = {
			'gpt-4o': {
				inputCostPerMillion: 7,
				outputCostPerMillion: 9,
				contextWindow: 1000,
				description: 'GPT 4o',
			},
		};

		const tokens: TokenUsage = {
			input: 1_000_000,
			output: 0,
			reasoning: 0,
			cache: {
				read: 0,
				write: 0,
			},
		};

		const usage = calculateUsageCost(tokens, 'gpt-5.2-high', configs);
		expect(usage.inputCost).toBeCloseTo(7, 6);
	});

	test('calculateUsageCost tracks unknown models', () => {
		clearUnknownModels();
		const tokens: TokenUsage = {
			input: 0,
			output: 0,
			reasoning: 0,
			cache: {
				read: 0,
				write: 0,
			},
		};
		const configs: ModelConfigMap = {};

		calculateUsageCost(tokens, 'unknown-model', configs);
		calculateUsageCost(tokens, 'unknown-model', configs);
		calculateUsageCost(tokens, 'other-unknown', configs);

		expect(getUnknownModels()).toEqual(['unknown-model', 'other-unknown']);
		clearUnknownModels();
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

	describe('calculateMessageCost with recorded cost', () => {
		test('uses message.cost when > 0 (OpenRouter)', () => {
			const message: Message = {
				id: 'msg_001',
				sessionID: 'ses_001',
				role: 'assistant',
				time: { created: 1_704_067_200_000 },
				modelID: 'anthropic/claude-3.5-sonnet',
				providerID: 'openrouter',
				tokens: {
					input: 1500,
					output: 800,
					reasoning: 0,
					cache: { read: 200, write: 100 },
				},
				cost: 0.0125,
			};

			const result = calculateMessageCost(message, {}, { silent: true });
			expect(result.totalCost).toBe(0.0125);
			expect(result.inputTokens).toBe(1500);
			expect(result.outputTokens).toBe(800);
		});

		test('calculates cost from tokens when message.cost is 0', () => {
			const message: Message = {
				id: 'msg_002',
				sessionID: 'ses_001',
				role: 'assistant',
				time: { created: 1_704_067_200_000 },
				modelID: 'gpt-4o',
				providerID: 'github-copilot',
				tokens: {
					input: 2000,
					output: 1200,
					reasoning: 0,
					cache: { read: 0, write: 0 },
				},
				cost: 0,
			};

			const configs: ModelConfigMap = {
				'gpt-4o': {
					inputCostPerMillion: 2.5,
					outputCostPerMillion: 10.0,
					contextWindow: 128000,
					description: 'GPT-4o',
				},
			};

			const result = calculateMessageCost(message, configs, { silent: true });
			expect(result.totalCost).toBeCloseTo(0.017, 5);
		});
	});

	describe('resolveUnknownModelsFromOpenRouter', () => {
		test('returns configs unchanged when unknownModelIds is empty', async () => {
			const configs = { ...baseConfig };
			const result = await resolveUnknownModelsFromOpenRouter([], configs, 'test-key');
			expect(result).toEqual(configs);
		});

		test('returns configs unchanged when apiKey is empty', async () => {
			const configs = { ...baseConfig };
			const result = await resolveUnknownModelsFromOpenRouter(['unknown-model'], configs, '');
			expect(result).toEqual(configs);
		});

		test('returns configs unchanged when non-author/slug has no config match', async () => {
			const configs = { ...baseConfig };
			const result = await resolveUnknownModelsFromOpenRouter(
				['invalid-format-model'],
				configs,
				'test-key',
			);
			expect(result).toEqual(configs);
		});

		test('uses config match when suffix matches', async () => {
			const configs: ModelConfigMap = {
				'minimax/minimax-m2.1': minimaxConfig,
			};
			const result = await resolveUnknownModelsFromOpenRouter(
				['minimax-m2.1'],
				configs,
				'test-key',
			);
			expect(result['minimax-m2.1']).toEqual(minimaxConfig);
		});

		test('uses config match when version separators normalize', async () => {
			const configs: ModelConfigMap = {
				'minimax/minimax-m2.1': minimaxConfig,
			};
			const result = await resolveUnknownModelsFromOpenRouter(
				['minimax-m2-1'],
				configs,
				'test-key',
			);
			expect(result['minimax-m2-1']).toEqual(minimaxConfig);
		});
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

	test('loadModelConfigsFromDir merges configs and prefers later files', async () => {
		const dir = await createTempDir();
		const firstPath = join(dir, 'alpha.json');
		const secondPath = join(dir, 'beta.json');

		try {
			await Bun.write(
				firstPath,
				JSON.stringify({
					'model-a': {
						inputCostPerMillion: 1,
						outputCostPerMillion: 2,
						contextWindow: 100,
						description: 'Model A',
					},
				}),
			);
			await Bun.write(
				secondPath,
				JSON.stringify({
					'model-a': {
						inputCostPerMillion: 2,
						outputCostPerMillion: 4,
						contextWindow: 200,
						description: 'Model A v2',
					},
					'model-b': {
						inputCostPerMillion: 3,
						outputCostPerMillion: 6,
						contextWindow: 300,
						description: 'Model B',
					},
				}),
			);

			const configs = await loadModelConfigsFromDir(dir);
			expect(configs['model-a']?.inputCostPerMillion).toBe(2);
			expect(configs['model-b']?.outputCostPerMillion).toBe(6);
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});

	test('loadAllModelConfigs supports file and directory paths', async () => {
		const dir = await createTempDir();
		const filePath = join(dir, 'models.json');
		const configDir = join(dir, 'models');

		try {
			await Bun.write(
				filePath,
				JSON.stringify({
					'model-c': {
						inputCostPerMillion: 3,
						outputCostPerMillion: 5,
						contextWindow: 1200,
						description: 'Model C',
					},
				}),
			);
			await mkdir(configDir);
			await Bun.write(
				join(configDir, 'one.json'),
				JSON.stringify({
					'model-d': {
						inputCostPerMillion: 4,
						outputCostPerMillion: 8,
						contextWindow: 1400,
						description: 'Model D',
					},
				}),
			);

			const fileConfigs = await loadAllModelConfigs(filePath);
			expect(fileConfigs['model-c']?.contextWindow).toBe(1200);

			const dirConfigs = await loadAllModelConfigs(configDir);
			expect(dirConfigs['model-d']?.inputCostPerMillion).toBe(4);
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});

	test('loadAllModelConfigs returns defaults when missing path', async () => {
		const missingPath = join(tmpdir(), `ocusage-missing-${crypto.randomUUID()}`);
		const configs = await loadAllModelConfigs(missingPath);
		expect(configs['gpt-5.2']?.inputCostPerMillion).toBe(1.75);
	});
});
