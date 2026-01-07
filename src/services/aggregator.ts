import type { Message, ModelConfigMap, Session, UsageSummary } from "@/models";
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
      model: "unknown",
      messages: [],
      usage: createEmptyUsageSummary(),
    };
  }

  const sessionId = messages[0].sessionID;
  let startTime = messages[0].time.created;
  let endTime = messages[0].time.created;
  let usage = createEmptyUsageSummary();
  const models = new Set<string>();

  for (const message of messages) {
    const created = message.time.created;
    if (created < startTime) startTime = created;
    if (created > endTime) endTime = created;

    models.add(message.modelID);
    usage = mergeUsageSummaries(
      usage,
      calculateMessageCost(message, configs, options),
    );
  }

  const model = models.size === 1 ? Array.from(models)[0] : "mixed";

  return {
    id: sessionId,
    startTime,
    endTime,
    model,
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
    const model = session.model;
    const current = summary.get(model) ?? createEmptyUsageSummary();
    summary.set(model, mergeUsageSummaries(current, session.usage));
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
