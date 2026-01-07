import type { Message } from "./message";
import type { UsageSummary } from "./usage";

export interface Session {
  id: string;
  startTime: number;
  endTime: number;
  model: string;
  messages: Message[];
  usage: UsageSummary;
}

export const getSessionDurationMinutes = (session: Session): number =>
  (session.endTime - session.startTime) / 60000;
