export interface ModelConfig {
	inputCostPerMillion: number;
	outputCostPerMillion: number;
	cacheCostPerMillion?: number;
	contextWindow: number;
	description: string;
}

export type ModelConfigMap = Record<string, ModelConfig>;

export const getCacheCostPerMillion = (config: ModelConfig): number =>
	config.cacheCostPerMillion ?? config.inputCostPerMillion;
