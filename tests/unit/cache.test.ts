import { describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ModelConfigMap } from '../../src/models/model';

const createTempHome = async (): Promise<string> => {
	return mkdtemp(join(tmpdir(), 'ocusage-cache-'));
};

const restoreEnvValue = (key: string, value: string | undefined): void => {
	if (value === undefined) {
		delete Bun.env[key];
		return;
	}
	Bun.env[key] = value;
};

type CachePayload = {
	timestamp: number;
	models: ModelConfigMap;
};

describe('cache storage', () => {
	test('saveCache/loadCache roundtrip and respects TTL', async () => {
		const home = await createTempHome();
		const originalHome = Bun.env.HOME;
		Bun.env.HOME = home;

		try {
			const cache = await import(`../../src/lib/cache?home=${encodeURIComponent(home)}`);
			const models: ModelConfigMap = {
				'model-a': {
					inputCostPerMillion: 1,
					outputCostPerMillion: 2,
					contextWindow: 100,
					description: 'Model A',
				},
			};

			await cache.saveCache(models);
			const fresh = await cache.loadCache();
			expect(fresh).toEqual(models);

			const stalePayload = {
				timestamp: Date.now() - 25 * 60 * 60 * 1000,
				models,
			};
			await Bun.write(cache.getCacheFile(), JSON.stringify(stalePayload));
			const stale = await cache.loadCache();
			expect(stale).toBeNull();
		} finally {
			restoreEnvValue('HOME', originalHome);
			await rm(home, { recursive: true, force: true });
		}
	});

	test('updateCache keeps timestamp when cache is valid', async () => {
		const home = await createTempHome();
		const originalHome = Bun.env.HOME;
		Bun.env.HOME = home;

		try {
			const cache = await import(`../../src/lib/cache?home=${encodeURIComponent(home)}&case=valid`);
			const models: ModelConfigMap = {
				'model-a': {
					inputCostPerMillion: 1,
					outputCostPerMillion: 2,
					contextWindow: 100,
					description: 'Model A',
				},
			};

			await cache.saveCache(models);
			const before = (await Bun.file(cache.getCacheFile()).json()) as CachePayload;
			await cache.updateCache('model-b', {
				inputCostPerMillion: 3,
				outputCostPerMillion: 4,
				contextWindow: 200,
				description: 'Model B',
			});
			const after = (await Bun.file(cache.getCacheFile()).json()) as CachePayload;

			expect(after.timestamp).toBe(before.timestamp);
			expect(after.models['model-a']?.description).toBe('Model A');
			expect(after.models['model-b']?.description).toBe('Model B');
		} finally {
			restoreEnvValue('HOME', originalHome);
			await rm(home, { recursive: true, force: true });
		}
	});

	test('updateCache refreshes timestamp when cache is stale', async () => {
		const home = await createTempHome();
		const originalHome = Bun.env.HOME;
		Bun.env.HOME = home;

		try {
			const cache = await import(`../../src/lib/cache?home=${encodeURIComponent(home)}&case=stale`);
			const models: ModelConfigMap = {
				'model-a': {
					inputCostPerMillion: 1,
					outputCostPerMillion: 2,
					contextWindow: 100,
					description: 'Model A',
				},
			};

			await cache.saveCache(models);
			const before = (await Bun.file(cache.getCacheFile()).json()) as CachePayload;
			const stalePayload: CachePayload = {
				timestamp: Date.now() - 25 * 60 * 60 * 1000,
				models: before.models,
			};
			await Bun.write(cache.getCacheFile(), JSON.stringify(stalePayload));
			await cache.updateCache('model-b', {
				inputCostPerMillion: 3,
				outputCostPerMillion: 4,
				contextWindow: 200,
				description: 'Model B',
			});
			const after = (await Bun.file(cache.getCacheFile()).json()) as CachePayload;

			expect(after.timestamp).toBeGreaterThan(stalePayload.timestamp);
			expect(after.models['model-b']?.description).toBe('Model B');
		} finally {
			restoreEnvValue('HOME', originalHome);
			await rm(home, { recursive: true, force: true });
		}
	});
});
