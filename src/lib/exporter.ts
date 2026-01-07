const needsCsvQuoting = (value: string): boolean => {
	return value.includes(',') || value.includes('\n') || value.includes('"');
};

const escapeCsvValue = (value: string): string => {
	if (!needsCsvQuoting(value)) return value;
	const escaped = value.replace(/"/g, '""');
	return `"${escaped}"`;
};

const formatCsvCell = (value: string | number): string => {
	if (typeof value === 'number') return value.toString();
	return escapeCsvValue(value);
};

export const formatAsCsv = (headers: string[], rows: (string | number)[][]): string => {
	if (headers.length === 0 && rows.length === 0) return '';

	const lines: string[] = [];

	if (headers.length > 0) {
		lines.push(headers.join(','));
	}

	for (const row of rows) {
		lines.push(row.map(formatCsvCell).join(','));
	}

	return lines.join('\n');
};

export type ModelUsageExport = {
	inputTokens: number;
	outputTokens: number;
	cacheTokens: number;
	costUSD: number;
};

export type SessionExportData = {
	sessionId: string;
	date: string;
	startTime: string;
	endTime: string;
	durationMinutes: number;
	models: Record<string, ModelUsageExport>;
	inputTokens: number;
	outputTokens: number;
	cacheTokens: number;
	costUSD: number;
};

export const getModelNamesForCsv = (models: Record<string, ModelUsageExport>): string =>
	Object.keys(models).join(',');

export type SessionsJsonOutput = {
	sessions: SessionExportData[];
	totals: {
		inputTokens: number;
		outputTokens: number;
		cacheTokens: number;
		costUSD: number;
	};
};

export const formatSessionsAsJson = (sessions: SessionExportData[]): string => {
	const totals = sessions.reduce(
		(acc, session) => {
			acc.inputTokens += session.inputTokens;
			acc.outputTokens += session.outputTokens;
			acc.cacheTokens += session.cacheTokens;
			acc.costUSD += session.costUSD;
			return acc;
		},
		{
			inputTokens: 0,
			outputTokens: 0,
			cacheTokens: 0,
			costUSD: 0,
		},
	);

	const payload: SessionsJsonOutput = {
		sessions,
		totals,
	};

	return JSON.stringify(payload, null, 2);
};

export type PeriodExportData = {
	period: string;
	sessions: number;
	inputTokens: number;
	outputTokens: number;
	cacheTokens: number;
	costUSD: number;
};

type PeriodTotals = {
	sessions: number;
	inputTokens: number;
	outputTokens: number;
	cacheTokens: number;
	costUSD: number;
};

type PeriodKey = 'daily' | 'weekly' | 'monthly';

type PeriodLabelKey = 'date' | 'week' | 'month';

type PeriodJsonRow = {
	sessions: number;
	inputTokens: number;
	outputTokens: number;
	cacheTokens: number;
	costUSD: number;
} & Partial<Record<PeriodLabelKey, string>>;

export type PeriodJsonOutput = {
	daily?: PeriodJsonRow[];
	weekly?: PeriodJsonRow[];
	monthly?: PeriodJsonRow[];
	totals: PeriodTotals;
};

const PERIOD_LABELS: Record<PeriodKey, PeriodLabelKey> = {
	daily: 'date',
	weekly: 'week',
	monthly: 'month',
};

const sumPeriodTotals = (periods: PeriodExportData[]): PeriodTotals => {
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

export const formatPeriodAsJson = (periods: PeriodExportData[], periodKey: PeriodKey): string => {
	const totals = sumPeriodTotals(periods);
	const labelKey = PERIOD_LABELS[periodKey];

	const rows = periods.map((period) => {
		const row: PeriodJsonRow = {
			[labelKey]: period.period,
			sessions: period.sessions,
			inputTokens: period.inputTokens,
			outputTokens: period.outputTokens,
			cacheTokens: period.cacheTokens,
			costUSD: period.costUSD,
		};

		return row;
	});

	const payload: PeriodJsonOutput = {
		totals,
	};

	payload[periodKey] = rows;

	return JSON.stringify(payload, null, 2);
};
