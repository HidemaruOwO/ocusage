import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DEFAULT_MODELS } from '../../src/models';
import { loadAllModelConfigs } from '../../src/services/cost';

const createTempDir = async (): Promise<string> => {
	return mkdtemp(join(tmpdir(), 'ocusage-cost-'));
};

describe('loadAllModelConfigs', () => {
	let originalApiKey: string | undefined;
	let tempDir: string;

	beforeEach(async () => {
		originalApiKey = Bun.env.OPENROUTER_API_KEY;
		delete Bun.env.OPENROUTER_API_KEY;
		tempDir = await createTempDir();
	});

	afterEach(async () => {
		if (originalApiKey !== undefined) {
			Bun.env.OPENROUTER_API_KEY = originalApiKey;
		} else {
			delete Bun.env.OPENROUTER_API_KEY;
		}
		await rm(tempDir, { recursive: true, force: true });
	});

	test('returns DEFAULT_MODELS when no API key and no local config', async () => {
		const nonExistentPath = join(tempDir, 'does-not-exist.json');
		const configs = await loadAllModelConfigs(nonExistentPath, {
			silent: true,
		});

		// Should contain DEFAULT_MODELS
		expect(Object.keys(configs).length).toBeGreaterThan(0);
		expect(configs['claude-3-5-sonnet-20241022']).toBeDefined();
		expect(configs['gpt-4o']).toBeDefined();
	});

	test('merges local config with DEFAULT_MODELS', async () => {
		const localConfigPath = join(tempDir, 'models.json');
		const customModel = {
			'custom-model': {
				inputCostPerMillion: 100,
				outputCostPerMillion: 200,
				contextWindow: 8000,
				description: 'Custom Model',
			},
		};
		await Bun.write(localConfigPath, JSON.stringify(customModel));

		const configs = await loadAllModelConfigs(localConfigPath, {
			silent: true,
		});

		// Should have custom model
		expect(configs['custom-model']).toBeDefined();
		expect(configs['custom-model'].inputCostPerMillion).toBe(100);

		// Should still have DEFAULT_MODELS
		expect(configs['claude-3-5-sonnet-20241022']).toBeDefined();
	});

	test('local config overrides DEFAULT_MODELS', async () => {
		const localConfigPath = join(tempDir, 'models.json');
		const overrideModel = {
			'gpt-4o': {
				inputCostPerMillion: 999,
				outputCostPerMillion: 888,
				contextWindow: 128000,
				description: 'Overridden GPT-4o',
			},
		};
		await Bun.write(localConfigPath, JSON.stringify(overrideModel));

		const configs = await loadAllModelConfigs(localConfigPath, {
			silent: true,
		});

		// Local config should override default
		expect(configs['gpt-4o'].inputCostPerMillion).toBe(999);
		expect(configs['gpt-4o'].description).toBe('Overridden GPT-4o');
	});

	test('handles directory of config files', async () => {
		const configDir = join(tempDir, 'configs');
		await mkdir(configDir, { recursive: true });
		await Bun.write(
			join(configDir, 'a.json'),
			JSON.stringify({
				'model-a': {
					inputCostPerMillion: 10,
					outputCostPerMillion: 20,
					contextWindow: 4000,
					description: 'Model A',
				},
			}),
		);
		await Bun.write(
			join(configDir, 'b.json'),
			JSON.stringify({
				'model-b': {
					inputCostPerMillion: 30,
					outputCostPerMillion: 40,
					contextWindow: 8000,
					description: 'Model B',
				},
			}),
		);

		const configs = await loadAllModelConfigs(configDir, { silent: true });

		expect(configs['model-a']).toBeDefined();
		expect(configs['model-b']).toBeDefined();
		// DEFAULT_MODELS still present
		expect(configs['claude-3-5-sonnet-20241022']).toBeDefined();
	});
});

describe('DEFAULT_MODELS fallback', () => {
	test('DEFAULT_MODELS contains essential models', () => {
		// Claude models
		expect(DEFAULT_MODELS['claude-3-5-sonnet-20241022']).toBeDefined();
		expect(DEFAULT_MODELS['claude-3-5-haiku-20241022']).toBeDefined();
		expect(DEFAULT_MODELS['claude-sonnet-4-20250514']).toBeDefined();

		// OpenAI models
		expect(DEFAULT_MODELS['gpt-4o']).toBeDefined();
		expect(DEFAULT_MODELS['gpt-4o-mini']).toBeDefined();

		// Google models
		expect(DEFAULT_MODELS['gemini-2.0-flash']).toBeDefined();
	});

	test('DEFAULT_MODELS have valid pricing structure', () => {
		for (const [_modelId, config] of Object.entries(DEFAULT_MODELS)) {
			expect(config.inputCostPerMillion).toBeGreaterThanOrEqual(0);
			expect(config.outputCostPerMillion).toBeGreaterThanOrEqual(0);
			expect(config.contextWindow).toBeGreaterThanOrEqual(0);
			expect(config.description).toBeTruthy();
		}
	});
});
