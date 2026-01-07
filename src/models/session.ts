import type { Message } from './message';
import type { UsageSummary } from './usage';

export interface ModelUsage {
	inputTokens: number;
	outputTokens: number;
	cacheTokens: number;
	costUSD: number;
}

export interface Session {
	id: string;
	startTime: number;
	endTime: number;
	models: Record<string, ModelUsage>;
	messages: Message[];
	usage: UsageSummary;
}

export const getSessionModelNames = (session: Session): string[] => Object.keys(session.models);

export const getSessionModelDisplay = (session: Session): string =>
	Object.keys(session.models).join(',');

export const getSessionDurationMinutes = (session: Session): number =>
	(session.endTime - session.startTime) / 60000;
