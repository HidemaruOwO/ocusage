export interface AppConfig {
	messagesDir: string;
	modelsFile: string;
	logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export const DEFAULT_CONFIG: AppConfig = {
	messagesDir: `${Bun.env.HOME}/.local/share/opencode/storage/message`,
	modelsFile: `${Bun.env.HOME}/.config/ocusage/models`,

	logLevel: 'warn',
};
