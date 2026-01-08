import { consola } from 'consola';
import { define } from 'gunshi';
import { renderHeader } from 'gunshi/renderer';
import { formatDate, formatTime } from '@/lib/date';
import { formatCost, formatTokens } from '@/lib/formatter';
import { dirExists } from '@/lib/fs';
import { createSpinner } from '@/lib/spinner';
import type { Message, Session } from '@/models';
import { getSessionDurationMinutes, getSessionModelDisplay, getSessionModelNames } from '@/models';
import { aggregateSessions } from '@/services/aggregator';
import { resolveMessagesDir, resolveModelsFile } from '@/services/config';
import { loadAllModelConfigs } from '@/services/cost';

type MessageTokenInfo = {
	input: number;
	output: number;
	cache: number;
};

type SessionJsonMessage = {
	index: number;
	role: Message['role'];
	time: string;
	tokens: MessageTokenInfo | null;
};

type SessionJsonOutput = {
	session: {
		id: string;
		date: string;
		startTime: string;
		endTime: string;
		durationMinutes: number;
		models: string[];
		messages: SessionJsonMessage[];
		summary: {
			inputTokens: number;
			outputTokens: number;
			cacheTokens: number;
			costUSD: number;
		};
	};
};

const roundMinutes = (minutes: number): number => {
	return Math.round(minutes * 10) / 10;
};

export const getMessageTokenInfo = (message: Message): MessageTokenInfo | null => {
	if (message.role === 'user') return null;
	if (!message.tokens) {
		return {
			input: 0,
			output: 0,
			cache: 0,
		};
	}

	const input = message.tokens.input ?? 0;
	const output = message.tokens.output ?? 0;
	const cacheRead = message.tokens.cache?.read ?? 0;
	const cacheWrite = message.tokens.cache?.write ?? 0;

	return {
		input,
		output,
		cache: cacheRead + cacheWrite,
	};
};

export const sortMessagesByTime = (messages: Message[]): Message[] => {
	const sorted = [...messages];
	sorted.sort((a, b) => a.time.created - b.time.created);
	return sorted;
};

const formatMessageTokenText = (message: Message): string => {
	const tokens = getMessageTokenInfo(message);
	if (!tokens) return '-';
	return `input: ${formatTokens(tokens.input)}, output: ${formatTokens(tokens.output)}, cache: ${formatTokens(tokens.cache)}`;
};

export const buildSessionJsonOutput = (session: Session): SessionJsonOutput => {
	const durationMinutes = roundMinutes(getSessionDurationMinutes(session));
	const messages = sortMessagesByTime(session.messages).map((message, index) => {
		const tokens = getMessageTokenInfo(message);
		return {
			index: index + 1,
			role: message.role,
			time: formatTime(message.time.created),
			tokens: tokens
				? {
						input: tokens.input,
						output: tokens.output,
						cache: tokens.cache,
					}
				: null,
		};
	});

	return {
		session: {
			id: session.id,
			date: formatDate(session.startTime),
			startTime: formatTime(session.startTime),
			endTime: formatTime(session.endTime),
			durationMinutes,
			models: getSessionModelNames(session),
			messages,
			summary: {
				inputTokens: session.usage.inputTokens,
				outputTokens: session.usage.outputTokens,
				cacheTokens: session.usage.cacheTokens,
				costUSD: session.usage.totalCost,
			},
		},
	};
};

const sessionCommand = define({
	name: 'session',
	description: 'Show session details',
	rendering: {
		header: null,
	},
	args: {
		id: {
			type: 'positional',
			description: 'Session ID (ses_xxx)',
			required: true,
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
	},
	run: async (ctx) => {
		const sessionId = ctx.values.id;
		const isSilent = ctx.values.json === true;
		const messagesDir = resolveMessagesDir(ctx.values.path);
		const modelsPath = resolveModelsFile();

		const exists = await dirExists(messagesDir);
		if (!exists) {
			throw new Error(`Messages directory not found: ${messagesDir}`);
		}

		if (!ctx.values.json) {
			const header = await renderHeader(ctx);
			if (header) {
				console.log(header);
				console.log('');
			}
		}

		const spinner = createSpinner('Processing session...', isSilent);
		spinner.start();

		const configs = await loadAllModelConfigs(modelsPath, { silent: isSilent });
		const sessions = await aggregateSessions(messagesDir, configs, {
			silent: isSilent,
		});
		const session = sessions.find((item) => item.id === sessionId);

		if (!session) {
			spinner.stop();
			throw new Error(`Session not found: ${sessionId}`);
		}

		spinner.succeed('Session processed');

		if (ctx.values.json) {
			const payload = buildSessionJsonOutput(session);
			console.log(JSON.stringify(payload, null, 2));
			return;
		}

		const durationMinutes = roundMinutes(getSessionDurationMinutes(session));
		const modelDisplay = getSessionModelDisplay(session) || '-';
		const messages = sortMessagesByTime(session.messages);
		const lines: string[] = [];

		lines.push(`Session: ${session.id}`);
		lines.push(`Date: ${formatDate(session.startTime)}`);
		lines.push(
			`Time: ${formatTime(session.startTime)} - ${formatTime(session.endTime)} (${durationMinutes} min)`,
		);
		lines.push(`Model: ${modelDisplay}`);
		lines.push('');
		lines.push('Messages:');

		const messageLines = messages.map((message, index) => {
			const indexLabel = `#${index + 1}`;
			const roleLabel = message.role;
			const timeLabel = formatTime(message.time.created);
			const tokenLabel = formatMessageTokenText(message);
			return `  ${indexLabel.padEnd(4)}${roleLabel.padEnd(10)}${timeLabel.padEnd(10)}${tokenLabel}`;
		});
		lines.push(...messageLines);
		lines.push('');
		lines.push('Summary:');
		lines.push(`  Input tokens:  ${formatTokens(session.usage.inputTokens)}`);
		lines.push(`  Output tokens: ${formatTokens(session.usage.outputTokens)}`);
		lines.push(`  Cache tokens:  ${formatTokens(session.usage.cacheTokens)}`);
		lines.push(`  Total cost:    ${formatCost(session.usage.totalCost)}`);

		consola.log(lines.join('\n'));
	},
});

export default sessionCommand;
