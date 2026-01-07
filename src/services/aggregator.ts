import type {
  Message,
  ModelConfigMap,
  ModelUsage,
  Session,
  UsageSummary,
} from "@/models";
import { createEmptyUsageSummary, mergeUsageSummaries } from "@/models";
import { calculateMessageCost } from "@/services/cost";
import { scanMessages } from "@/services/parser";

type CostOptions = {
  silent?: boolean;
};

export const buildSession = (
  messages: Message[],
  configs: ModelConfigMap,
  options?: CostOptions,
): Session => {
  if (messages.length === 0) {
    return {
      id: "unknown",
      startTime: 0,
      endTime: 0,
      models: {},
      messages: [],
      usage: createEmptyUsageSummary(),
    };
  }

  const sessionId = messages[0].sessionID || "unknown";
  let startTime = messages[0].time.created;
  let endTime = messages[0].time.created;
  let usage = createEmptyUsageSummary();
  const modelUsages: Record<string, ModelUsage> = {};

  for (const message of messages) {
    const created = message.time.created;
    if (created < startTime) startTime = created;
    if (created > endTime) endTime = created;

    const modelId = message.modelID?.trim();
    const messageCost = calculateMessageCost(message, configs, options);
    usage = mergeUsageSummaries(usage, messageCost);
    if (!modelId) {
      continue;
    }

    const modelKey = message.modelID;
    const existing = modelUsages[modelKey] ?? {
      inputTokens: 0,
      outputTokens: 0,
      cacheTokens: 0,
      costUSD: 0,
    };
    modelUsages[modelKey] = {
      inputTokens: existing.inputTokens + messageCost.inputTokens,
      outputTokens: existing.outputTokens + messageCost.outputTokens,
      cacheTokens: existing.cacheTokens + messageCost.cacheTokens,
      costUSD: existing.costUSD + messageCost.totalCost,
    };
  }

  return {
    id: sessionId,
    startTime,
    endTime,
    models: modelUsages,
    messages,
    usage,
  };
};

export const aggregateSessions = async (
  messagesDir: string,
  configs: ModelConfigMap,
  options?: CostOptions,
): Promise<Session[]> => {
  const sessionMap = new Map<string, Message[]>();

  for await (const message of scanMessages(messagesDir)) {
    const list = sessionMap.get(message.sessionID);
    if (list) {
      list.push(message);
    } else {
      sessionMap.set(message.sessionID, [message]);
    }
  }

  const sessions: Session[] = [];
  for (const messages of sessionMap.values()) {
    sessions.push(buildSession(messages, configs, options));
  }

  return sessions;
};

export const aggregateByModel = (
  sessions: Session[],
): Map<string, UsageSummary> => {
  const summary = new Map<string, UsageSummary>();

  for (const session of sessions) {
    for (const [modelId, modelUsage] of Object.entries(session.models)) {
      const current = summary.get(modelId) ?? createEmptyUsageSummary();
      summary.set(
        modelId,
        mergeUsageSummaries(current, {
          inputTokens: modelUsage.inputTokens,
          outputTokens: modelUsage.outputTokens,
          cacheTokens: modelUsage.cacheTokens,
          inputCost: 0,
          outputCost: 0,
          cacheCost: 0,
          totalCost: modelUsage.costUSD,
        }),
      );
    }
  }

  return summary;
};

export const aggregateByPeriod = (
  sessions: Session[],
  periodFn: (date: Date) => string,
): Map<string, { sessions: number; usage: UsageSummary }> => {
  const summary = new Map<string, { sessions: number; usage: UsageSummary }>();

  for (const session of sessions) {
    const key = periodFn(new Date(session.startTime));
    const current = summary.get(key);

    if (!current) {
      summary.set(key, {
        sessions: 1,
        usage: mergeUsageSummaries(createEmptyUsageSummary(), session.usage),
      });
      continue;
    }

    summary.set(key, {
      sessions: current.sessions + 1,
      usage: mergeUsageSummaries(current.usage, session.usage),
    });
  }

  return summary;
};
