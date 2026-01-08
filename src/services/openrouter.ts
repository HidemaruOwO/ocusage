import type { ModelConfig, ModelConfigMap } from '@/models';
import type {
	OpenRouterModel,
	OpenRouterModelsResponse,
	OpenRouterPricing,
} from '@/models/openrouter-response';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/models';

type OpenRouterEndpoint = {
	pricing: OpenRouterPricing;
};

type OpenRouterSingleModelResponse = {
	data: {
		id: string;
		name: string;
		context_length: number;
		endpoints?: OpenRouterEndpoint[];
	};
};

const toMillionTokenCost = (pricePerToken: string): number => {
	const price = Number.parseFloat(pricePerToken);
	if (Number.isNaN(price)) return 0;
	return price * 1_000_000;
};

const toModelConfig = (model: OpenRouterModel): ModelConfig => {
	const pricing = model.pricing;
	return {
		inputCostPerMillion: toMillionTokenCost(pricing.prompt),
		outputCostPerMillion: toMillionTokenCost(pricing.completion),
		cacheCostPerMillion: pricing.input_cache_read
			? toMillionTokenCost(pricing.input_cache_read)
			: undefined,
		contextWindow: model.context_length,
		description: model.name,
	};
};

export const fetchOpenRouterModels = async (apiKey: string): Promise<ModelConfigMap> => {
	const response = await fetch(OPENROUTER_API_URL, {
		headers: {
			Authorization: `Bearer ${apiKey}`,
		},
	});

	if (!response.ok) {
		throw new Error(`OpenRouter API error: ${response.status}`);
	}

	const data: OpenRouterModelsResponse = await response.json();
	const configs: ModelConfigMap = {};

	for (const model of data.data) {
		configs[model.id] = toModelConfig(model);
	}

	return configs;
};

export const fetchSingleModelFromOpenRouter = async (
	modelId: string,
	apiKey: string,
): Promise<ModelConfig | null> => {
	const parts = modelId.split('/');
	if (parts.length !== 2) return null;
	if (!parts[0] || !parts[1]) return null;

	let response: Response;
	try {
		response = await fetch(`${OPENROUTER_API_URL}/${modelId}/endpoints`, {
			headers: {
				Authorization: `Bearer ${apiKey}`,
			},
		});
	} catch {
		return null;
	}

	if (!response.ok) return null;

	let data: OpenRouterSingleModelResponse;
	try {
		data = await response.json();
	} catch {
		return null;
	}

	const model = data.data;
	const endpoints = model.endpoints;
	if (!endpoints || endpoints.length === 0) return null;

	const endpoint = endpoints[0];
	if (!endpoint?.pricing) return null;

	const configModel: OpenRouterModel = {
		id: model.id,
		name: model.name,
		context_length: model.context_length,
		pricing: endpoint.pricing,
	};

	return toModelConfig(configModel);
};
