import type { ModelExportData, PeriodExportData } from '@/lib/exporter';
import type { Session } from '@/models';

export type OutputFormat = 'table' | 'csv' | 'json';

export type OutputFormatOptions = {
	json?: boolean;
	csv?: boolean;
};

export type SessionFilters = {
	from?: number;
	to?: number;
	model?: string;
};

export type PeriodTotals = {
	sessions: number;
	inputTokens: number;
	outputTokens: number;
	cacheTokens: number;
	costUSD: number;
};

export type ModelTotals = {
	inputTokens: number;
	outputTokens: number;
	cacheTokens: number;
	costUSD: number;
};

export const resolveOutputFormat = (options: OutputFormatOptions): OutputFormat | null => {
	if (options.json && options.csv) return null;
	if (options.json) return 'json';
	if (options.csv) return 'csv';
	return 'table';
};

export const filterSessions = (sessions: Session[], filters: SessionFilters): Session[] => {
	let result = sessions;

	if (filters.from !== undefined) {
		const from = filters.from;
		result = result.filter((session) => session.startTime >= from);
	}

	if (filters.to !== undefined) {
		const to = filters.to;
		result = result.filter((session) => session.startTime <= to);
	}

	if (filters.model) {
		const model = filters.model;
		result = result.filter((session) => model in session.models);
	}

	return result;
};

export const sumPeriods = (periods: PeriodExportData[]): PeriodTotals => {
	return periods.reduce(
		(acc, period) => {
			acc.sessions += period.sessions;
			acc.inputTokens += period.inputTokens;
			acc.outputTokens += period.outputTokens;
			acc.cacheTokens += period.cacheTokens;
			acc.costUSD += period.costUSD;
			return acc;
		},
		{
			sessions: 0,
			inputTokens: 0,
			outputTokens: 0,
			cacheTokens: 0,
			costUSD: 0,
		},
	);
};

export const sumModels = (models: ModelExportData[]): ModelTotals => {
	return models.reduce(
		(acc, model) => {
			acc.inputTokens += model.inputTokens;
			acc.outputTokens += model.outputTokens;
			acc.cacheTokens += model.cacheTokens;
			acc.costUSD += model.costUSD;
			return acc;
		},
		{
			inputTokens: 0,
			outputTokens: 0,
			cacheTokens: 0,
			costUSD: 0,
		},
	);
};
