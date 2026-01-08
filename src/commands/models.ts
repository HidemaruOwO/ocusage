import { consola } from 'consola';
import { define } from 'gunshi';
import { renderHeader } from 'gunshi/renderer';
import { filterSessions, resolveOutputFormat, sumModels } from '@/lib/command-utils';
import { parseDate } from '@/lib/date';
import type { ModelExportData } from '@/lib/exporter';
import { formatAsCsv, formatModelsAsJson } from '@/lib/exporter';
import { formatCost, formatTable, formatTokens } from '@/lib/formatter';
import { dirExists } from '@/lib/fs';
import { createSpinner } from '@/lib/spinner';
import { printUnknownModelsSummary } from '@/lib/unknown-models';
import { aggregateByModel, aggregateSessions } from '@/services/aggregator';
import { resolveMessagesDir, resolveModelsFile } from '@/services/config';
import { loadAllModelConfigs } from '@/services/cost';

const TABLE_HEADERS = ['MODEL', 'INPUT', 'OUTPUT', 'CACHE', 'COST'];

const EXPORT_HEADERS = ['model', 'input_tokens', 'output_tokens', 'cache_tokens', 'total_cost'];

const modelsCommand = define({
	name: 'models',
	description: 'Show usage by model',
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
		const sessions = await aggregateSessions(messagesDir, configs, {
			silent: isSilent,
		});
		spinner.succeed('Sessions processed');

		const filtered = filterSessions(sessions, {
			from: fromTime,
			to: toTime,
		});

		const summary = aggregateByModel(filtered);
		const modelRows: ModelExportData[] = Array.from(summary.entries())
			.map(([model, usage]) => {
				return {
					model,
					inputTokens: usage.inputTokens,
					outputTokens: usage.outputTokens,
					cacheTokens: usage.cacheTokens,
					costUSD: usage.totalCost,
				};
			})
			.sort((a, b) => a.model.localeCompare(b.model));

		const totals = sumModels(modelRows);

		if (outputFormat === 'csv') {
			const csvRows: (string | number)[][] = modelRows.map((row) => {
				return [row.model, row.inputTokens, row.outputTokens, row.cacheTokens, row.costUSD];
			});
			console.log(formatAsCsv(EXPORT_HEADERS, csvRows));
			return;
		}

		if (outputFormat === 'json') {
			console.log(formatModelsAsJson(modelRows, totals));
			return;
		}

		const tableRows = modelRows.map((row) => {
			return [
				row.model,
				formatTokens(row.inputTokens),
				formatTokens(row.outputTokens),
				formatTokens(row.cacheTokens),
				formatCost(row.costUSD),
			];
		});

		const separator = '-'.repeat(60);
		tableRows.push([separator]);
		tableRows.push([
			'TOTAL',
			formatTokens(totals.inputTokens),
			formatTokens(totals.outputTokens),
			formatTokens(totals.cacheTokens),
			formatCost(totals.costUSD),
		]);

		const table = formatTable(TABLE_HEADERS, tableRows);
		consola.log(table);
		if (!isSilent) {
			printUnknownModelsSummary(ctx.values['show-unknown'] ?? false);
		}
	},
});

export default modelsCommand;
