import type { AppConfig } from "@/models";
import { DEFAULT_CONFIG } from "@/models";
import { expandPath } from "@/lib/fs";
import { consola } from "consola";

const isNonEmpty = (value: string | undefined): value is string => {
  if (typeof value !== "string") return false;
  return value.trim().length > 0;
};

const resolveEnvPath = (key: string): string | undefined => {
  const value = Bun.env[key];
  if (!isNonEmpty(value)) return undefined;
  return expandPath(value.trim());
};

const resolveLogLevel = (
  override?: AppConfig["logLevel"],
): AppConfig["logLevel"] => {
  if (override) return override;

  const envLevel = Bun.env.OCUSAGE_LOG_LEVEL;
  if (
    envLevel === "debug" ||
    envLevel === "info" ||
    envLevel === "warn" ||
    envLevel === "error"
  ) {
    return envLevel;
  }

  if (isNonEmpty(envLevel)) {
    consola.warn(
      `Unknown log level: ${envLevel} (fallback to ${DEFAULT_CONFIG.logLevel})`,
    );
  }

  return DEFAULT_CONFIG.logLevel;
};

export const resolveMessagesDir = (cliPath?: string): string => {
  if (isNonEmpty(cliPath)) return expandPath(cliPath.trim());

  const envPath = resolveEnvPath("OCUSAGE_MESSAGES_DIR");
  if (envPath) return envPath;

  return expandPath(DEFAULT_CONFIG.messagesDir);
};

export const resolveModelsFile = (cliPath?: string): string => {
  if (isNonEmpty(cliPath)) return expandPath(cliPath.trim());

  const envPath = resolveEnvPath("OCUSAGE_MODELS_FILE");
  if (envPath) return envPath;

  return expandPath(DEFAULT_CONFIG.modelsFile);
};

export const loadAppConfig = (
  overrides: Partial<AppConfig> = {},
): AppConfig => {
  const messagesDir = resolveMessagesDir(overrides.messagesDir);
  const modelsFile = resolveModelsFile(overrides.modelsFile);
  const logLevel = resolveLogLevel(overrides.logLevel);

  return {
    messagesDir,
    modelsFile,
    logLevel,
  };
};
