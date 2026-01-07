import { define } from 'gunshi';
import { consola } from 'consola';
import { resolveMessagesDir, resolveModelsFile } from '@/services/config';
import { loadAllModelConfigs } from '@/services/cost';
import { aggregateSessions } from '@/services/aggregator';
import { dirExists } from '@/lib/fs';
import { formatDate, formatTime, parseDate } from '@/lib/date';
import { formatCost, formatDuration, formatTable, formatTokens } from '@/lib/formatter';
import type { Session } from '@/models';
import { getSessionDurationMinutes } from '@/models';

type SortKey = 'date' | 'cost' | 'tokens';
type SortOrder = 'asc' | 'desc';

type SessionFilters = {
	from?: number;
	to?: number;
	model?: string;
};

const DEFAULT_SORT_KEY: SortKey = 'date';
const DEFAULT_SORT_ORDER: SortOrder = 'desc';

const getSessionTokenTotal = (session: Session): number => {
	return session.usage.inputTokens + session.usage.outputTokens + session.usage.cacheTokens;
};

const normalizeSortKey = (value?: string): SortKey => {
	if (value === 'date' || value === 'cost' || value === 'tokens') return value;
	return DEFAULT_SORT_KEY;
};

const normalizeSortOrder = (value?: string): SortOrder => {
	if (value === 'asc' || value === 'desc') return value;
	return DEFAULT_SORT_ORDER;
};

const getSortValue = (session: Session, key: SortKey): number => {
	if (key === 'cost') return session.usage.totalCost;
	if (key === 'tokens') return getSessionTokenTotal(session);
	return session.startTime;
};

const roundMinutes = (minutes: number): number => {
	return Math.round(minutes * 10) / 10;
};

export const filterSessions = (sessions: Session[], filters: SessionFilters): Session[] => {
	let result = sessions;

	if (filters.from !== undefined) {
		result = result.filter((session) => session.startTime >= filters.from);
	}

	if (filters.to !== undefined) {
		result = result.filter((session) => session.startTime <= filters.to);
	}

	if (filters.model) {
		result = result.filter((session) => session.model === filters.model);
	}

	return result;
};

export const sortSessions = (sessions: Session[], key: SortKey, order: SortOrder): Session[] => {
	const sorted = [...sessions];

	sorted.sort((a, b) => {
		const diff = getSortValue(a, key) - getSortValue(b, key);
		if (diff === 0) return 0;
		return order === 'asc' ? diff : -diff;
	});

	return sorted;
};

const sessionsCommand = define({
	name: 'sessions',
	description: 'List all sessions',
	args: {
		from: {
			type: 'string',
			short: 'f',
			description: 'Start date (YYYY-MM-DD)',
		},
		to: {
			type: 'string',
			short: 't',
			description: 'End date (YYYY-MM-DD)',
		},
		model: {
			type: 'string',
			short: 'm',
			description: 'Filter by model',
		},
		path: {
			type: 'string',
			short: 'p',
			description: 'Messages directory',
		},
		sort: {
			type: 'string',
			short: 's',
			description: 'Sort by (date/cost/tokens)',
			default: DEFAULT_SORT_KEY,
		},
		order: {
			type: 'string',
			description: 'Sort order (asc/desc)',
			default: DEFAULT_SORT_ORDER,
		},
	},
	run: async (ctx) => {
		const messagesDir = resolveMessagesDir(ctx.values.path);
		const modelsPath = resolveModelsFile();

		const exists = await dirExists(messagesDir);
		if (!exists) {
			consola.error(`Messages directory not found: ${messagesDir}`);
			Bun.exit(1);
			return;
		}

		const fromText = ctx.values.from;
		const toText = ctx.values.to;

		const fromDate = fromText ? parseDate(fromText) : null;
		if (fromText && !fromDate) {
			consola.error(`Invalid --from date: ${fromText}`);
			Bun.exit(1);
			return;
		}

		const toDate = toText ? parseDate(toText) : null;
		if (toText && !toDate) {
			consola.error(`Invalid --to date: ${toText}`);
			Bun.exit(1);
			return;
		}

		const fromTime = fromDate ? fromDate.getTime() : undefined;
		const toTime = toDate
			? new Date(
					toDate.getFullYear(),
					toDate.getMonth(),
					toDate.getDate(),
					23,
					59,
					59,
					999,
				).getTime()
			: undefined;

		if (fromTime !== undefined && toTime !== undefined && fromTime > toTime) {
			consola.error('Invalid date range: --from is after --to');
			Bun.exit(1);
			return;
		}

		const configs = await loadAllModelConfigs(modelsPath);
		const sessions = await aggregateSessions(messagesDir, configs);

		const filtered = filterSessions(sessions, {
			from: fromTime,
			to: toTime,
			model: ctx.values.model,
		});

		const sortKey = normalizeSortKey(ctx.values.sort);
		const sortOrder = normalizeSortOrder(ctx.values.order);
		const sorted = sortSessions(filtered, sortKey, sortOrder);

		const headers = [
			'SESSION_ID',
			'DATE',
			'START',
			'END',
			'DURATION',
			'MODEL',
			'INPUT',
			'OUTPUT',
			'CACHE',
			'COST',
		];

		const rows = sorted.map((session) => {
			const duration = roundMinutes(getSessionDurationMinutes(session));
			return [
				session.id,
				formatDate(session.startTime),
				formatTime(session.startTime),
				formatTime(session.endTime),
				formatDuration(duration),
				session.model,
				formatTokens(session.usage.inputTokens),
				formatTokens(session.usage.outputTokens),
				formatTokens(session.usage.cacheTokens),
				formatCost(session.usage.totalCost),
			];
		});

		const table = formatTable(headers, rows);
		consola.log(table);
	},
});

export type { SortKey, SortOrder, SessionFilters };
export default sessionsCommand;
