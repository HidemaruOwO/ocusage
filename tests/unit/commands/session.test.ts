import { describe, expect, test } from 'bun:test';
import {
	buildSessionJsonOutput,
	getMessageTokenInfo,
	sortMessagesByTime,
} from '../../../src/commands/session';
import type { Message, Session } from '../../../src/models';

const createMessage = (overrides: Partial<Message>): Message => {
	return {
		id: 'msg_default',
		sessionID: 'ses_default',
		role: 'user',
		time: {
			created: new Date(2025, 0, 1, 10, 0, 0).getTime(),
		},
		modelID: 'model-a',
		providerID: 'anthropic',
		cost: 0,
		...overrides,
	};
};

const createSession = (overrides: Partial<Session>): Session => {
	return {
		id: 'ses_default',
		startTime: new Date(2025, 0, 1, 10, 0, 0).getTime(),
		endTime: new Date(2025, 0, 1, 10, 5, 0).getTime(),
		models: {
			'model-a': {
				inputTokens: 10,
				outputTokens: 5,
				cacheTokens: 2,
				costUSD: 0.1,
			},
		},
		messages: [],
		usage: {
			inputTokens: 10,
			outputTokens: 5,
			cacheTokens: 2,
			inputCost: 0.05,
			outputCost: 0.03,
			cacheCost: 0.02,
			totalCost: 0.1,
		},
		...overrides,
	};
};

describe('session command helpers', () => {
	test('getMessageTokenInfo returns null for user messages', () => {
		const message = createMessage({
			role: 'user',
			tokens: {
				input: 1,
				output: 2,
				reasoning: 0,
				cache: {
					read: 3,
					write: 4,
				},
			},
		});

		expect(getMessageTokenInfo(message)).toBeNull();
	});

	test('getMessageTokenInfo aggregates cache tokens for assistant messages', () => {
		const message = createMessage({
			role: 'assistant',
			tokens: {
				input: 1200,
				output: 300,
				reasoning: 0,
				cache: {
					read: 200,
					write: 100,
				},
			},
		});

		expect(getMessageTokenInfo(message)).toEqual({
			input: 1200,
			output: 300,
			cache: 300,
		});
	});

	test('sortMessagesByTime sorts by created time', () => {
		const early = createMessage({
			id: 'msg_early',
			time: {
				created: new Date(2025, 0, 1, 9, 0, 0).getTime(),
			},
		});
		const late = createMessage({
			id: 'msg_late',
			time: {
				created: new Date(2025, 0, 1, 11, 0, 0).getTime(),
			},
		});

		const sorted = sortMessagesByTime([late, early]);
		expect(sorted.map((message) => message.id)).toEqual(['msg_early', 'msg_late']);
	});

	test('buildSessionJsonOutput formats session details and messages', () => {
		const userMessage = createMessage({
			id: 'msg_user',
			role: 'user',
			time: {
				created: new Date(2025, 0, 1, 10, 0, 0).getTime(),
			},
		});
		const assistantMessage = createMessage({
			id: 'msg_assistant',
			role: 'assistant',
			time: {
				created: new Date(2025, 0, 1, 10, 0, 5).getTime(),
			},
			tokens: {
				input: 10,
				output: 4,
				reasoning: 0,
				cache: {
					read: 1,
					write: 1,
				},
			},
		});
		const session = createSession({
			id: 'ses_demo',
			messages: [assistantMessage, userMessage],
		});

		const output = buildSessionJsonOutput(session);

		expect(output.session.id).toBe('ses_demo');
		expect(output.session.date).toBe('2025-01-01');
		expect(output.session.startTime).toBe('10:00:00');
		expect(output.session.endTime).toBe('10:05:00');
		expect(output.session.durationMinutes).toBe(5);
		expect(output.session.models).toEqual(['model-a']);
		expect(output.session.messages).toHaveLength(2);
		expect(output.session.messages[0]).toEqual({
			index: 1,
			role: 'user',
			time: '10:00:00',
			tokens: null,
		});
		expect(output.session.messages[1]).toEqual({
			index: 2,
			role: 'assistant',
			time: '10:00:05',
			tokens: {
				input: 10,
				output: 4,
				cache: 2,
			},
		});
		expect(output.session.summary).toEqual({
			inputTokens: 10,
			outputTokens: 5,
			cacheTokens: 2,
			costUSD: 0.1,
		});
	});
});
