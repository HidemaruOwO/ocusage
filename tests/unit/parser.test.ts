import { describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Message } from '../../src/models/message';
import { isValidMessage, parseMessageFile, scanMessages } from '../../src/services/parser';

const createTempDir = async (): Promise<string> => {
	return mkdtemp(join(tmpdir(), 'ocusage-parser-'));
};

const baseMessage: Message = {
	id: 'msg_1',
	sessionID: 'ses_1',
	role: 'assistant',
	time: {
		created: 1_700_000_000_000,
	},
	modelID: 'model-a',
	providerID: 'provider',
	tokens: {
		input: 100,
		output: 50,
		reasoning: 0,
		cache: {
			read: 10,
			write: 5,
		},
	},
	cost: 0,
};

const writeJson = async (filePath: string, data: unknown): Promise<void> => {
	await Bun.write(filePath, JSON.stringify(data));
};

const writeInvalidJson = async (filePath: string): Promise<void> => {
	await Bun.write(filePath, '{invalid json');
};

describe('parser utilities', () => {
	test('isValidMessage validates required fields', () => {
		expect(isValidMessage(baseMessage)).toBe(true);
		expect(isValidMessage({ ...baseMessage, id: 123 })).toBe(false);
		expect(isValidMessage({ ...baseMessage, time: {} })).toBe(false);
	});

	test('parseMessageFile returns message for valid JSON', async () => {
		const dir = await createTempDir();
		const filePath = join(dir, 'msg_valid.json');

		try {
			await writeJson(filePath, baseMessage);
			const message = await parseMessageFile(filePath);
			expect(message).not.toBeNull();
			expect(message?.id).toBe(baseMessage.id);
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});

	test('parseMessageFile returns null for invalid JSON', async () => {
		const dir = await createTempDir();
		const filePath = join(dir, 'msg_invalid.json');

		try {
			await writeInvalidJson(filePath);
			const message = await parseMessageFile(filePath);
			expect(message).toBeNull();
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});

	test('scanMessages yields only valid message files', async () => {
		const dir = await createTempDir();
		const validPath = join(dir, 'msg_valid.json');
		const invalidPath = join(dir, 'msg_invalid.json');
		const ignoredPath = join(dir, 'note.json');

		try {
			await writeJson(validPath, baseMessage);
			await writeInvalidJson(invalidPath);
			await writeJson(ignoredPath, baseMessage);

			const results: Message[] = [];
			for await (const message of scanMessages(dir)) {
				results.push(message);
			}

			expect(results.length).toBe(1);
			expect(results[0]?.id).toBe(baseMessage.id);
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});
});
