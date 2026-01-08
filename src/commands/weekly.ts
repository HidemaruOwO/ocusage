import { consola } from 'consola';
import { define } from 'gunshi';
import { renderHeader } from 'gunshi/renderer';
import { filterSessions, resolveOutputFormat, sumPeriods } from '@/lib/command-utils';
import { getWeekNumber, getWeekStart, parseDate } from '@/lib/date';
import type { PeriodExportData } from '@/lib/exporter';
import { formatAsCsv, formatPeriodAsJson } from '@/lib/exporter';
import { formatCost, formatTable, formatTokens } from '@/lib/formatter';
import { dirExists } from '@/lib/fs';
import { createSpinner } from '@/lib/spinner';
import { printUnknownModelsSummary } from '@/lib/unknown-models';
import { aggregateByPeriod, aggregateSessions } from '@/services/aggregator';
import { resolveMessagesDir, resolveModelsFile, resolveOpenRouterApiKey } from '@/services/config';
import {
	clearUnknownModels,
	getUnknownModels,
	loadAllModelConfigs,
	resetUnknownModels,
	resolveUnknownModelsFromOpenRouter,
} from '@/services/cost';

const TABLE_HEADERS = ['WEEK', 'SESSIONS', 'INPUT', 'OUTPUT', 'CACHE', 'COST', 'MODELS'];

const EXPORT_HEADERS = [
	'week',
	'sessions',
	'input_tokens',
	'output_tokens',
	'cache_tokens',
	'cost_usd',
	'models',
];

const weeklyCommand = define({
	name: 'weekly',
	description: 'Show weekly usage',
	rendering: {
		header: null,
	},
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
		json: {
			type: 'boolean',
			description: 'Output as JSON',
		},
		csv: {
			type: 'boolean',
			description: 'Output as CSV',
		},
		'show-unknown': {
			type: 'boolean',
			description: 'Show unknown model names',
		},
	},
	run: async (ctx) => {
		const outputFormat = resolveOutputFormat({
			json: ctx.values.json,
			csv: ctx.values.csv,
		});

		if (!outputFormat) {
			throw new Error('Cannot use --json and --csv together');
		}

		if (outputFormat === 'table') {
			const header = await renderHeader(ctx);
			if (header) {
				console.log(header);
				console.log('');
			}
		}

		clearUnknownModels();
		const isSilent = outputFormat === 'json' || outputFormat === 'csv';
		const messagesDir = resolveMessagesDir(ctx.values.path);
		const modelsPath = resolveModelsFile();

		const exists = await dirExists(messagesDir);
		if (!exists) {
			throw new Error(`Messages directory not found: ${messagesDir}`);
		}

		const fromText = ctx.values.from;
		const toText = ctx.values.to;

		const fromDate = fromText ? parseDate(fromText) : null;
		if (fromText && !fromDate) {
			throw new Error(`Invalid --from date: ${fromText}`);
		}

		const toDate = toText ? parseDate(toText) : null;
		if (toText && !toDate) {
			throw new Error(`Invalid --to date: ${toText}`);
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
			throw new Error('Invalid date range: --from is after --to');
		}

		const spinner = createSpinner('Processing sessions...', isSilent);
		spinner.start();

		const configs = await loadAllModelConfigs(modelsPath, { silent: isSilent });
		let sessions = await aggregateSessions(messagesDir, configs, {
			silent: isSilent,
		});

		const unknowns = getUnknownModels();
		const apiKey = resolveOpenRouterApiKey();
		if (unknowns.length > 0) {
			spinner.text = 'Resolving unknown models...';
			resetUnknownModels();
			const updatedConfigs = await resolveUnknownModelsFromOpenRouter(
				unknowns,
				configs,
				apiKey ?? '',
			);
			spinner.text = 'Reprocessing sessions...';
			sessions = await aggregateSessions(messagesDir, updatedConfigs, {
				silent: isSilent,
			});
		}

		spinner.succeed('Sessions processed');

		const filtered = filterSessions(sessions, {
			from: fromTime,
			to: toTime,
			model: ctx.values.model,
		});

		const summary = aggregateByPeriod(filtered, (date) => {
			const weekStart = getWeekStart(date);
			const year = weekStart.getFullYear();
			const week = getWeekNumber(weekStart);
			return `${year}-W${week.toString().padStart(2, '0')}`;
		});
		const periodRows: PeriodExportData[] = Array.from(summary.entries())
			.map(([period, data]) => {
				return {
					period,
					sessions: data.sessions,
					models: Object.keys(data.models),
					inputTokens: data.usage.inputTokens,
					outputTokens: data.usage.outputTokens,
					cacheTokens: data.usage.cacheTokens,
					costUSD: data.usage.totalCost,
				};
			})
			.sort((a, b) => a.period.localeCompare(b.period));

		if (outputFormat === 'csv') {
			const csvRows: (string | number)[][] = periodRows.map((row) => {
				const modelsText = row.models.join(', ');
				return [
					row.period,
					row.sessions,
					row.inputTokens,
					row.outputTokens,
					row.cacheTokens,
					row.costUSD,
					modelsText,
				];
			});
			console.log(formatAsCsv(EXPORT_HEADERS, csvRows));
			return;
		}

		if (outputFormat === 'json') {
			console.log(formatPeriodAsJson(periodRows, 'weekly'));
			return;
		}

		const totals = sumPeriods(periodRows);
		const tableRows = periodRows.map((row) => {
			return [
				row.period,
				row.sessions.toString(),
				formatTokens(row.inputTokens),
				formatTokens(row.outputTokens),
				formatTokens(row.cacheTokens),
				formatCost(row.costUSD),
				row.models.join(', '),
			];
		});

		const separator = '-'.repeat(70);
		tableRows.push([separator]);
		tableRows.push([
			'TOTAL',
			totals.sessions.toString(),
			formatTokens(totals.inputTokens),
			formatTokens(totals.outputTokens),
			formatTokens(totals.cacheTokens),
			formatCost(totals.costUSD),
			'',
		]);

		const table = formatTable(TABLE_HEADERS, tableRows);
		consola.log(table);
		if (!isSilent) {
			printUnknownModelsSummary(ctx.values['show-unknown'] ?? false);
		}
	},
});

export default weeklyCommand;
