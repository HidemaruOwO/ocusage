import { afterEach, describe, expect, test } from 'bun:test';
import type { OpenRouterModelsResponse } from '../../src/models/openrouter-response';
import { fetchOpenRouterModels } from '../../src/services/openrouter';

const originalFetch = globalThis.fetch;

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
