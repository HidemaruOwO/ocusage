import { afterEach, describe, expect, test } from 'bun:test';
import type { OpenRouterModelsResponse } from '../../src/models/openrouter-response';
import {
	fetchOpenRouterModels,
	fetchSingleModelFromOpenRouter,
} from '../../src/services/openrouter';

const originalFetch = globalThis.fetch;

type OpenRouterSingleModelResponse = {
	data: {
		id: string;
		name: string;
		context_length: number;
		endpoints: Array<{
			pricing: {
				prompt: string;
				completion: string;
				input_cache_read?: string;
			};
		}>;
	};
};

afterEach(() => {
	globalThis.fetch = originalFetch;
});

describe('openrouter service', () => {
	test('fetchOpenRouterModels maps pricing to per-million costs', async () => {
		const payload: OpenRouterModelsResponse = {
			data: [
				{
					id: 'openai/gpt-4o',
					name: 'GPT-4o',
					pricing: {
						prompt: '0.005',
						completion: '0.012',
						input_cache_read: '0.001',
					},
					context_length: 128000,
				},
			],
		};

		const mockFetch = Object.assign(
			async () =>
				new Response(JSON.stringify(payload), {
					status: 200,
				}),
			{ preconnect: originalFetch.preconnect },
		) as typeof fetch;
		globalThis.fetch = mockFetch;

		const configs = await fetchOpenRouterModels('test-key');
		const config = configs['openai/gpt-4o'];
		expect(config?.inputCostPerMillion).toBe(5000);
		expect(config?.outputCostPerMillion).toBe(12000);
		expect(config?.cacheCostPerMillion).toBe(1000);
		expect(config?.contextWindow).toBe(128000);
		expect(config?.description).toBe('GPT-4o');
	});

	test('fetchSingleModelFromOpenRouter maps endpoint pricing', async () => {
		const payload: OpenRouterSingleModelResponse = {
			data: {
				id: 'openai/gpt-4o',
				name: 'GPT-4o',
				context_length: 8192,
				endpoints: [
					{
						pricing: {
							prompt: '0.001',
							completion: '0.002',
							input_cache_read: '0.0005',
						},
					},
				],
			},
		};

		const mockFetch = Object.assign(
			async () =>
				new Response(JSON.stringify(payload), {
					status: 200,
				}),
			{ preconnect: originalFetch.preconnect },
		) as typeof fetch;
		globalThis.fetch = mockFetch;

		const config = await fetchSingleModelFromOpenRouter('openai/gpt-4o', 'test-key');
		expect(config?.inputCostPerMillion).toBe(1000);
		expect(config?.outputCostPerMillion).toBe(2000);
		expect(config?.cacheCostPerMillion).toBe(500);
		expect(config?.contextWindow).toBe(8192);
		expect(config?.description).toBe('GPT-4o');
	});

	test('fetchSingleModelFromOpenRouter returns null for invalid model id', async () => {
		const config = await fetchSingleModelFromOpenRouter('gpt-4o', 'test-key');
		expect(config).toBeNull();
	});

	test('fetchSingleModelFromOpenRouter returns null on 404', async () => {
		const mockFetch = Object.assign(async () => new Response('missing', { status: 404 }), {
			preconnect: originalFetch.preconnect,
		}) as typeof fetch;
		globalThis.fetch = mockFetch;

		const config = await fetchSingleModelFromOpenRouter('openai/gpt-4o', 'test-key');
		expect(config).toBeNull();
	});

	test('fetchOpenRouterModels throws on non-ok response', async () => {
		const mockFetch = Object.assign(async () => new Response('error', { status: 500 }), {
			preconnect: originalFetch.preconnect,
		}) as typeof fetch;
		globalThis.fetch = mockFetch;

		let error: Error | undefined;
		try {
			await fetchOpenRouterModels('test-key');
		} catch (err) {
			error = err as Error;
		}

		expect(error?.message).toBe('OpenRouter API error: 500');
	});
});
