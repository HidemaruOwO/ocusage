import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Message } from "../../src/models/message";
import type { ModelConfigMap } from "../../src/models/model";
import type { Session } from "../../src/models/session";
import { formatDate } from "../../src/lib/date";
import {
  aggregateByModel,
  aggregateByPeriod,
  aggregateSessions,
  buildSession,
} from "../../src/services/aggregator";

const createTempDir = async (): Promise<string> => {
  return mkdtemp(join(tmpdir(), "ocusage-agg-"));
};

const configs: ModelConfigMap = {
  "model-a": {
    inputCostPerMillion: 10,
    outputCostPerMillion: 20,
    cacheCostPerMillion: 5,
    contextWindow: 1000,
    description: "Model A",
  },
  "model-b": {
    inputCostPerMillion: 1,
    outputCostPerMillion: 1,
    contextWindow: 1000,
    description: "Model B",
  },
};

const createMessage = (overrides: Partial<Message>): Message => {
  return {
    id: "msg_default",
    sessionID: "ses_default",
    role: "assistant",
    time: {
      created: 1_700_000_000_000,
    },
    modelID: "model-a",
    providerID: "provider",
    tokens: {
      input: 1000,
      output: 0,
      reasoning: 0,
      cache: {
        read: 0,
        write: 0,
      },
    },
    cost: 0,
    ...overrides,
  };
};

describe("aggregator", () => {
  test("buildSession aggregates times and usage", () => {
    const messages = [
      createMessage({ id: "msg_1", time: { created: 1_700_000_000_000 } }),
      createMessage({ id: "msg_2", time: { created: 1_700_000_000_500 } }),
    ];

    const session = buildSession(messages, configs);
    expect(session.id).toBe("ses_default");
    expect(session.startTime).toBe(1_700_000_000_000);
    expect(session.endTime).toBe(1_700_000_000_500);
    expect(session.model).toBe("model-a");
    expect(session.usage.inputTokens).toBe(2000);
    expect(session.usage.inputCost).toBeCloseTo(0.02, 6);
  });

  test("buildSession marks mixed model when multiple models exist", () => {
    const messages = [
      createMessage({ id: "msg_1", modelID: "model-a" }),
      createMessage({ id: "msg_2", modelID: "model-b" }),
    ];

    const session = buildSession(messages, configs);
    expect(session.model).toBe("mixed");
  });

  test("aggregateByModel sums usage by session model", () => {
    const sessionA = buildSession(
      [createMessage({ modelID: "model-a" })],
      configs,
    );
    const sessionB = buildSession(
      [createMessage({ modelID: "model-b" })],
      configs,
    );
    const summary = aggregateByModel([sessionA, sessionB]);

    expect(summary.get("model-a")?.inputTokens).toBe(1000);
    expect(summary.get("model-b")?.inputTokens).toBe(1000);
  });

  test("aggregateByPeriod groups sessions by period key", () => {
    const sessionA: Session = {
      id: "ses_1",
      startTime: new Date(2025, 0, 1).getTime(),
      endTime: new Date(2025, 0, 1).getTime(),
      model: "model-a",
      messages: [],
      usage: {
        inputTokens: 1,
        outputTokens: 0,
        cacheTokens: 0,
        inputCost: 0.001,
        outputCost: 0,
        cacheCost: 0,
        totalCost: 0.001,
      },
    };

    const sessionB: Session = {
      id: "ses_2",
      startTime: new Date(2025, 0, 1).getTime(),
      endTime: new Date(2025, 0, 1).getTime(),
      model: "model-a",
      messages: [],
      usage: {
        inputTokens: 2,
        outputTokens: 0,
        cacheTokens: 0,
        inputCost: 0.002,
        outputCost: 0,
        cacheCost: 0,
        totalCost: 0.002,
      },
    };

    const summary = aggregateByPeriod([sessionA, sessionB], (date) =>
      formatDate(date.getTime()),
    );
    const entry = summary.get("2025-01-01");
    expect(entry?.sessions).toBe(2);
    expect(entry?.usage.inputTokens).toBe(3);
  });

  test("aggregateSessions builds sessions from message files", async () => {
    const dir = await createTempDir();
    const sessionDirA = join(dir, "ses_a");
    const sessionDirB = join(dir, "ses_b");

    try {
      await mkdir(sessionDirA, { recursive: true });
      await mkdir(sessionDirB, { recursive: true });

      await Bun.write(
        join(sessionDirA, "msg_1.json"),
        JSON.stringify(createMessage({ id: "msg_1", sessionID: "ses_a" })),
      );
      await Bun.write(
        join(sessionDirB, "msg_2.json"),
        JSON.stringify(createMessage({ id: "msg_2", sessionID: "ses_b" })),
      );

      const sessions = await aggregateSessions(dir, configs);
      const ids = sessions.map((session) => session.id).sort();
      expect(ids).toEqual(["ses_a", "ses_b"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
