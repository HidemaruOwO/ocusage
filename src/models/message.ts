export interface MessageTime {
  created: number;
  completed?: number;
}

export interface CacheTokens {
  read: number;
  write: number;
}

export interface TokenUsage {
  input: number;
  output: number;
  reasoning: number;
  cache: CacheTokens;
}

export type MessageRole = "user" | "assistant";

export interface Message {
  id: string;
  sessionID: string;
  role: MessageRole;
  time: MessageTime;
  modelID: string;
  providerID: string;
  tokens?: TokenUsage;
  cost: number;
  finish?: string;
}
