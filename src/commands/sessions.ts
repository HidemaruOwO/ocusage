import { consola } from "consola";
import { define } from "gunshi";
import { renderHeader } from "gunshi/renderer";
import { formatDate, formatDateHuman, formatTime, parseDate } from "@/lib/date";
import type { SessionExportData } from "@/lib/exporter";
import {
  formatAsCsv,
  formatSessionsAsJson,
  getModelNamesForCsv,
} from "@/lib/exporter";
import {
  formatCost,
  formatDuration,
  formatTable,
  formatTokens,
} from "@/lib/formatter";
import { dirExists } from "@/lib/fs";
import { printUnknownModelsSummary } from "@/lib/unknown-models";
import type { Session } from "@/models";
import { getSessionDurationMinutes, getSessionModelDisplay } from "@/models";
import { aggregateSessions } from "@/services/aggregator";
import { resolveMessagesDir, resolveModelsFile } from "@/services/config";
import { loadAllModelConfigs } from "@/services/cost";

type SortKey = "date" | "cost" | "tokens";
type SortOrder = "asc" | "desc";
type OutputFormat = "table" | "csv" | "json";

type SessionFilters = {
  from?: number;
  to?: number;
  model?: string;
};

type OutputFormatOptions = {
  json?: boolean;
  csv?: boolean;
};

const DEFAULT_SORT_KEY: SortKey = "date";
const DEFAULT_SORT_ORDER: SortOrder = "desc";

const TABLE_HEADERS = [
  "SESSION_ID",
  "DATE",
  "START",
  "END",
  "DURATION",
  "MODEL",
  "INPUT",
  "OUTPUT",
  "CACHE",
  "COST",
];

const EXPORT_HEADERS = [
  "session_id",
  "date",
  "start_time",
  "end_time",
  "duration_minutes",
  "model",
  "input_tokens",
  "output_tokens",
  "cache_tokens",
  "total_cost",
];

const getSessionTokenTotal = (session: Session): number => {
  return (
    session.usage.inputTokens +
    session.usage.outputTokens +
    session.usage.cacheTokens
  );
};

const normalizeSortKey = (value?: string): SortKey => {
  if (value === "date" || value === "cost" || value === "tokens") return value;
  return DEFAULT_SORT_KEY;
};

const normalizeSortOrder = (value?: string): SortOrder => {
  if (value === "asc" || value === "desc") return value;
  return DEFAULT_SORT_ORDER;
};

const getSortValue = (session: Session, key: SortKey): number => {
  if (key === "cost") return session.usage.totalCost;
  if (key === "tokens") return getSessionTokenTotal(session);
  return session.startTime;
};

const roundMinutes = (minutes: number): number => {
  return Math.round(minutes * 10) / 10;
};

export const filterSessions = (
  sessions: Session[],
  filters: SessionFilters,
): Session[] => {
  let result = sessions;

  if (filters.from !== undefined) {
    const from = filters.from;
    result = result.filter((session) => session.startTime >= from);
  }

  if (filters.to !== undefined) {
    const to = filters.to;
    result = result.filter((session) => session.startTime <= to);
  }

  if (filters.model) {
    const model = filters.model;
    result = result.filter((session) => session.models[model] !== undefined);
  }

  return result;
};

export const sortSessions = (
  sessions: Session[],
  key: SortKey,
  order: SortOrder,
): Session[] => {
  const sorted = [...sessions];

  sorted.sort((a, b) => {
    const diff = getSortValue(a, key) - getSortValue(b, key);
    if (diff === 0) return 0;
    return order === "asc" ? diff : -diff;
  });

  return sorted;
};

export const resolveOutputFormat = (
  options: OutputFormatOptions,
): OutputFormat | null => {
  if (options.json && options.csv) return null;
  if (options.json) return "json";
  if (options.csv) return "csv";
  return "table";
};

const sessionsCommand = define({
  name: "sessions",
  description: "List all sessions",
  rendering: {
    header: null,
  },
  args: {
    from: {
      type: "string",
      short: "f",
      description: "Start date (YYYY-MM-DD)",
    },
    to: {
      type: "string",
      short: "t",
      description: "End date (YYYY-MM-DD)",
    },
    model: {
      type: "string",
      short: "m",
      description: "Filter by model",
    },
    path: {
      type: "string",
      short: "p",
      description: "Messages directory",
    },
    sort: {
      type: "string",
      short: "s",
      description: "Sort by (date/cost/tokens)",
      default: DEFAULT_SORT_KEY,
    },
    order: {
      type: "string",
      description: "Sort order (asc/desc)",
      default: DEFAULT_SORT_ORDER,
    },
    json: {
      type: "boolean",
      description: "Output as JSON",
    },
    csv: {
      type: "boolean",
      description: "Output as CSV",
    },
    "show-unknown": {
      type: "boolean",
      description: "Show unknown model names",
    },
  },
  run: async (ctx) => {
    const outputFormat = resolveOutputFormat({
      json: ctx.values.json,
      csv: ctx.values.csv,
    });

    if (!outputFormat) {
      consola.error("Cannot use --json and --csv together");
      Bun.exit(2);
      return;
    }

    if (outputFormat === "table") {
      const header = await renderHeader(ctx);
      if (header) {
        console.log(header);
        console.log("");
      }
    }

    const isSilent = outputFormat === "json" || outputFormat === "csv";
    const messagesDir = resolveMessagesDir(ctx.values.path);
    const modelsPath = resolveModelsFile();

    const exists = await dirExists(messagesDir);
    if (!exists) {
      consola.error(`Messages directory not found: ${messagesDir}`);
      Bun.exit(1);
      return;
    }

    const fromText = ctx.values.from;
    const toText = ctx.values.to;

    const fromDate = fromText ? parseDate(fromText) : null;
    if (fromText && !fromDate) {
      consola.error(`Invalid --from date: ${fromText}`);
      Bun.exit(1);
      return;
    }

    const toDate = toText ? parseDate(toText) : null;
    if (toText && !toDate) {
      consola.error(`Invalid --to date: ${toText}`);
      Bun.exit(1);
      return;
    }

    const fromTime = fromDate ? fromDate.getTime() : undefined;
    const toTime = toDate
      ? new Date(
          toDate.getFullYear(),
          toDate.getMonth(),
          toDate.getDate(),
          23,
          59,
          59,
          999,
        ).getTime()
      : undefined;

    if (fromTime !== undefined && toTime !== undefined && fromTime > toTime) {
      consola.error("Invalid date range: --from is after --to");
      Bun.exit(1);
      return;
    }

    const configs = await loadAllModelConfigs(modelsPath, { silent: isSilent });
    const sessions = await aggregateSessions(messagesDir, configs, {
      silent: isSilent,
    });

    const filtered = filterSessions(sessions, {
      from: fromTime,
      to: toTime,
      model: ctx.values.model,
    });

    const sortKey = normalizeSortKey(ctx.values.sort);
    const sortOrder = normalizeSortOrder(ctx.values.order);
    const sorted = sortSessions(filtered, sortKey, sortOrder);

    const baseRows = sorted.map((session) => {
      const durationMinutes = roundMinutes(getSessionDurationMinutes(session));
      const modelDisplay = getSessionModelDisplay(session);
      const modelCsv = getModelNamesForCsv(session.models);

      return {
        sessionId: session.id,
        date: formatDate(session.startTime),
        startTime: formatTime(session.startTime),
        endTime: formatTime(session.endTime),
        durationMinutes,
        modelDisplay,
        modelCsv,
        inputTokens: session.usage.inputTokens,
        outputTokens: session.usage.outputTokens,
        cacheTokens: session.usage.cacheTokens,
        totalCost: session.usage.totalCost,
      };
    });

    const jsonRows: SessionExportData[] = sorted.map((session) => {
      const durationMinutes = roundMinutes(getSessionDurationMinutes(session));

      return {
        sessionId: session.id,
        date: formatDateHuman(session.startTime),
        startTime: formatTime(session.startTime),
        endTime: formatTime(session.endTime),
        durationMinutes,
        models: session.models,
        inputTokens: session.usage.inputTokens,
        outputTokens: session.usage.outputTokens,
        cacheTokens: session.usage.cacheTokens,
        costUSD: session.usage.totalCost,
      };
    });

    const tableRows = baseRows.map((row) => {
      return [
        row.sessionId,
        row.date,
        row.startTime,
        row.endTime,
        formatDuration(row.durationMinutes),
        row.modelDisplay,
        formatTokens(row.inputTokens),
        formatTokens(row.outputTokens),
        formatTokens(row.cacheTokens),
        formatCost(row.totalCost),
      ];
    });

    const csvRows: (string | number)[][] = baseRows.map((row) => {
      return [
        row.sessionId,
        row.date,
        row.startTime,
        row.endTime,
        row.durationMinutes,
        row.modelCsv,
        row.inputTokens,
        row.outputTokens,
        row.cacheTokens,
        row.totalCost,
      ];
    });

    if (outputFormat === "csv") {
      console.log(formatAsCsv(EXPORT_HEADERS, csvRows));
      return;
    }

    if (outputFormat === "json") {
      console.log(formatSessionsAsJson(jsonRows));
      return;
    }

    const table = formatTable(TABLE_HEADERS, tableRows);
    consola.log(table);
    if (!isSilent) {
      printUnknownModelsSummary(ctx.values["show-unknown"] ?? false);
    }
  },
});

export type { SortKey, SortOrder, SessionFilters };
export default sessionsCommand;
