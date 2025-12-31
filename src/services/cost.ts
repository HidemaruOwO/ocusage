import type { Message, ModelConfig, ModelConfigMap, TokenUsage, UsageSummary } from '@/models';
import { getCacheCostPerMillion } from '@/models';
import { createEmptyUsageSummary } from '@/models';
import { fileExists } from '@/lib/fs';
import { consola } from 'consola';

const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isFiniteNumber = (value: unknown): value is number => {
	return typeof value === 'number' && Number.isFinite(value);
};

const getNumberValue = (record: Record<string, unknown>, keys: string[]): number | null => {
	for (const key of keys) {
		const value = record[key];
		if (isFiniteNumber(value)) return value;
	}
	return null;
};

const getStringValue = (record: Record<string, unknown>, keys: string[]): string | null => {
	for (const key of keys) {
		const value = record[key];
		if (typeof value === 'string') return value;
	}
	return null;
};

const toModelConfig = (record: Record<string, unknown>): ModelConfig | null => {
	const inputCostPerMillion = getNumberValue(record, [
		'inputCostPerMillion',
		'input_cost_per_million',
	]);
	const outputCostPerMillion = getNumberValue(record, [
		'outputCostPerMillion',
		'output_cost_per_million',
	]);
	const contextWindow = getNumberValue(record, ['contextWindow', 'context_window']);
	const description = getStringValue(record, ['description']);

	if (inputCostPerMillion === null || outputCostPerMillion === null) return null;
	if (contextWindow === null || description === null) return null;

	const cacheCostPerMillion = getNumberValue(record, [
		'cacheCostPerMillion',
		'cache_cost_per_million',
	]);

	return {
		inputCostPerMillion,
		outputCostPerMillion,
		cacheCostPerMillion: cacheCostPerMillion ?? undefined,
		contextWindow,
		description,
	};
};

const normalizeTokens = (tokens?: Partial<TokenUsage>): TokenUsage => {
	return {
		input: tokens?.input ?? 0,
		output: tokens?.output ?? 0,
		reasoning: tokens?.reasoning ?? 0,
		cache: {
			read: tokens?.cache?.read ?? 0,
			write: tokens?.cache?.write ?? 0,
		},
	};
};

const tokensToCost = (tokens: number, costPerMillion: number): number => {
	return (tokens / 1_000_000) * costPerMillion;
};

export const loadModelConfigs = async (modelsFile: string): Promise<ModelConfigMap> => {
	const exists = await fileExists(modelsFile);
	if (!exists) {
		consola.warn(`models.json not found at ${modelsFile} (all costs set to 0)`);
		return {};
	}

	let data: unknown;
	try {
		data = await Bun.file(modelsFile).json();
	} catch (error) {
		consola.warn(`Failed to parse models.json at ${modelsFile} (all costs set to 0)`);
		consola.debug(error);
		return {};
	}

	if (!isRecord(data)) {
		consola.warn(`Invalid models.json format at ${modelsFile} (all costs set to 0)`);
		return {};
	}

	const configs: ModelConfigMap = {};
	for (const [modelId, rawConfig] of Object.entries(data)) {
		if (!isRecord(rawConfig)) {
			consola.warn(`Invalid model config for ${modelId} (skipped)`);
			continue;
		}

		const config = toModelConfig(rawConfig);
		if (!config) {
			consola.warn(`Invalid model config for ${modelId} (skipped)`);
			continue;
		}

		configs[modelId] = config;
	}

	return configs;
};

export const calculateUsageCost = (
	tokens: TokenUsage,
	modelId: string,
	configs: ModelConfigMap,
): UsageSummary => {
	const normalized = normalizeTokens(tokens);
	const inputTokens = normalized.input;
	const outputTokens = normalized.output;
	const cacheTokens = normalized.cache.read + normalized.cache.write;

	const config = configs[modelId];
	if (!config) {
		consola.warn(`Unknown model: ${modelId} (cost set to 0)`);
		return {
			inputTokens,
			outputTokens,
			cacheTokens,
			inputCost: 0,
			outputCost: 0,
			cacheCost: 0,
			totalCost: 0,
		};
	}

	const inputCost = tokensToCost(inputTokens, config.inputCostPerMillion);
	const outputCost = tokensToCost(outputTokens, config.outputCostPerMillion);
	const cacheCost = tokensToCost(cacheTokens, getCacheCostPerMillion(config));

	return {
		inputTokens,
		outputTokens,
		cacheTokens,
		inputCost,
		outputCost,
		cacheCost,
		totalCost: inputCost + outputCost + cacheCost,
	};
};

export const calculateMessageCost = (message: Message, configs: ModelConfigMap): UsageSummary => {
	if (!message.tokens) return createEmptyUsageSummary();

	return calculateUsageCost(normalizeTokens(message.tokens), message.modelID, configs);
};
