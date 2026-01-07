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

export type SessionExportData = {
	sessionId: string;
	date: string;
	startTime: string;
	endTime: string;
	durationMinutes: number;
	model: string;
	inputTokens: number;
	outputTokens: number;
	cacheTokens: number;
	costUSD: number;
};

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
