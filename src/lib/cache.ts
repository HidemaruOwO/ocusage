import { consola } from 'consola';
import { mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { ModelConfig, ModelConfigMap } from '@/models';

const CACHE_DIR = join(homedir(), '.cache', 'ocusage');
const CACHE_FILE = join(CACHE_DIR, 'models-cache.json');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type CacheData = {
	timestamp: number;
	models: ModelConfigMap;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isCacheData = (value: unknown): value is CacheData => {
	if (!isRecord(value)) return false;
	if (typeof value.timestamp !== 'number' || !Number.isFinite(value.timestamp)) return false;
	if (!isRecord(value.models)) return false;
	return true;
};

const readCacheFile = async (): Promise<CacheData | null> => {
	const file = Bun.file(CACHE_FILE);
	let text: string;
	try {
		text = await file.text();
	} catch (error) {
		consola.warn(`Failed to read cache file: ${CACHE_FILE}`);
		consola.debug(error);
		return null;
	}

	let data: unknown;
	try {
		data = JSON.parse(text);
	} catch (error) {
		consola.warn('Cache file is corrupted (invalid JSON).');
		consola.debug(error);
		return null;
	}

	if (!isCacheData(data)) {
		consola.warn('Cache file has unexpected format. Ignoring it.');
		return null;
	}

	return data;
};

export const getCacheDir = (): string => CACHE_DIR;
export const getCacheFile = (): string => CACHE_FILE;

export const isCacheValid = (timestamp: number): boolean => {
	return Date.now() - timestamp < CACHE_TTL_MS;
};

export const loadCache = async (): Promise<ModelConfigMap | null> => {
	const file = Bun.file(CACHE_FILE);
	const exists = await file.exists();
	if (!exists) return null;

	const data = await readCacheFile();
	if (!data) return null;
	if (!isCacheValid(data.timestamp)) return null;
	return data.models;
};

export const saveCache = async (models: ModelConfigMap): Promise<void> => {
	try {
		await mkdir(CACHE_DIR, { recursive: true });
	} catch (error) {
		consola.error(`Failed to create cache directory: ${CACHE_DIR}`);
		consola.debug(error);
		throw error;
	}

	const payload: CacheData = {
		timestamp: Date.now(),
		models,
	};

	try {
		await Bun.write(CACHE_FILE, JSON.stringify(payload, null, 2));
	} catch (error) {
		consola.error(`Failed to write cache file: ${CACHE_FILE}`);
		consola.debug(error);
		throw error;
	}
};

export const updateCache = async (modelId: string, config: ModelConfig): Promise<void> => {
	const file = Bun.file(CACHE_FILE);
	const exists = await file.exists();
	let timestamp = Date.now();
	let models: ModelConfigMap = {
		[modelId]: config,
	};

	if (exists) {
		const data = await readCacheFile();
		if (data) {
			models = {
				...data.models,
				[modelId]: config,
			};
			if (isCacheValid(data.timestamp)) {
				timestamp = data.timestamp;
			}
		}
	}

	try {
		await mkdir(CACHE_DIR, { recursive: true });
	} catch (error) {
		consola.error(`Failed to create cache directory: ${CACHE_DIR}`);
		consola.debug(error);
		throw error;
	}

	const payload: CacheData = {
		timestamp,
		models,
	};

	try {
		await Bun.write(CACHE_FILE, JSON.stringify(payload, null, 2));
	} catch (error) {
		consola.error(`Failed to write cache file: ${CACHE_FILE}`);
		consola.debug(error);
		throw error;
	}
};
