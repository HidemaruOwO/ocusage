export type OpenRouterPricing = {
	prompt: string;
	completion: string;
	image?: string;
	request?: string;
	input_cache_read?: string;
	input_cache_write?: string;
};

export type OpenRouterModel = {
	id: string;
	name: string;
	pricing: OpenRouterPricing;
	context_length: number;
};

export type OpenRouterModelsResponse = {
	data: OpenRouterModel[];
};
