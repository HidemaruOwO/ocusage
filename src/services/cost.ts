import type { Message, ModelConfig, ModelConfigMap, TokenUsage, UsageSummary } from '@/models';
import { getCacheCostPerMillion } from '@/models';
import { createEmptyUsageSummary } from '@/models';
import { dirExists, fileExists } from '@/lib/fs';
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

const providerPrefixes = ['anthropic/', 'openai/', 'google/', 'xai/'] as const;

type IndexedModelConfig = {
	key: string;
	config: ModelConfig;
	normalizedNoDate: string;
};

const stripProviderPrefix = (modelId: string): string => {
	for (const prefix of providerPrefixes) {
		if (modelId.startsWith(prefix)) return modelId.slice(prefix.length);
	}
	return modelId;
};

const normalizeVersionSeparators = (modelId: string): string => {
	return modelId.replace(/[._]/g, '-');
};

const stripDateSuffix = (modelId: string): string => {
	return modelId.replace(/-\d{8}$/u, '');
};

const buildCandidateIds = (modelId: string): string[] => {
	const normalized = normalizeVersionSeparators(stripProviderPrefix(modelId));
	const base = stripDateSuffix(normalized);
	const candidates: string[] = [];
	const addCandidate = (value: string): void => {
		if (!value) return;
		if (!candidates.includes(value)) candidates.push(value);
	};

	addCandidate(base);

	if (base.startsWith('gpt-')) {
		const segments = base.split('-').filter(Boolean);
		for (let i = segments.length - 1; i >= 2; i -= 1) {
			addCandidate(segments.slice(0, i).join('-'));
		}
	}

	return candidates;
};

const buildConfigIndex = (configs: ModelConfigMap): IndexedModelConfig[] => {
	return Object.entries(configs).map(([key, config]) => {
		const normalizedKey = normalizeVersionSeparators(stripProviderPrefix(key));
		return {
			key,
			config,
			normalizedNoDate: stripDateSuffix(normalizedKey),
		};
	});
};

const findMatchingModel = (modelId: string, configs: ModelConfigMap): ModelConfig | null => {
	const direct = configs[modelId];
	if (direct) return direct;

	const baseId = stripProviderPrefix(modelId);
	const baseConfig = configs[baseId];
	if (baseConfig) {
		consola.debug(`Using ${baseId} pricing for ${modelId}`);
		return baseConfig;
	}

	const candidates = buildCandidateIds(baseId);
	const indexedConfigs = buildConfigIndex(configs);

	for (const candidate of candidates) {
		const match = indexedConfigs.find(
			(entry) =>
				entry.normalizedNoDate === candidate || entry.normalizedNoDate.startsWith(`${candidate}-`),
		);
		if (match) {
			consola.debug(`Using ${match.key} pricing for ${modelId}`);
			return match.config;
		}
	}

	if (normalizeVersionSeparators(baseId).startsWith('gpt-')) {
		const fallbackMatch = indexedConfigs.find(
			(entry) =>
				entry.normalizedNoDate === 'gpt-4o' || entry.normalizedNoDate.startsWith('gpt-4o-'),
		);
		if (fallbackMatch) {
			consola.debug(`Using ${fallbackMatch.key} pricing for ${modelId}`);
			return fallbackMatch.config;
		}
	}

	return null;
};

// 未知モデルの警告を1回だけ表示するためのキャッシュ
const warnedModels = new Set<string>();

export const loadModelConfigs = async (modelsFile: string): Promise<ModelConfigMap> => {
	const exists = await fileExists(modelsFile);
	if (!exists) {
		consola.warn(`Model config not found at ${modelsFile} (all costs set to 0)`);
		return {};
	}

	let data: unknown;
	try {
		data = await Bun.file(modelsFile).json();
	} catch (error) {
		consola.warn(`Failed to parse model config at ${modelsFile} (all costs set to 0)`);
		consola.debug(error);
		return {};
	}

	if (!isRecord(data)) {
		consola.warn(`Invalid model config format at ${modelsFile} (all costs set to 0)`);
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

export const loadModelConfigsFromDir = async (dir: string): Promise<ModelConfigMap> => {
	const glob = new Bun.Glob('*.json');
	const filePaths: string[] = [];
	for await (const filePath of glob.scan({
		cwd: dir,
		absolute: true,
	})) {
		filePaths.push(filePath);
	}

	filePaths.sort((a, b) => a.localeCompare(b));
	const merged: ModelConfigMap = {};
	for (const filePath of filePaths) {
		const configs = await loadModelConfigs(filePath);
		for (const [modelId, config] of Object.entries(configs)) {
			merged[modelId] = config;
		}
	}

	return merged;
};

export const loadAllModelConfigs = async (modelsPath: string): Promise<ModelConfigMap> => {
	if (await dirExists(modelsPath)) {
		return loadModelConfigsFromDir(modelsPath);
	}

	if (await fileExists(modelsPath)) {
		return loadModelConfigs(modelsPath);
	}

	consola.warn(`Model config not found at ${modelsPath} (all costs set to 0)`);
	return {};
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

	const config = findMatchingModel(modelId, configs);
	if (!config) {
		if (!warnedModels.has(modelId)) {
			warnedModels.add(modelId);
			consola.warn(`Unknown model: ${modelId} (cost set to 0)`);
		}
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

/** テスト用: 警告キャッシュをリセット */
export const resetWarnedModels = (): void => {
	warnedModels.clear();
};
