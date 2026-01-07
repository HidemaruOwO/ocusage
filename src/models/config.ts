export interface AppConfig {
  messagesDir: string;
  modelsFile: string;
  logLevel: "debug" | "info" | "warn" | "error";
}

export const DEFAULT_CONFIG: AppConfig = {
  messagesDir: "~/.local/share/opencode/storage/message",
  modelsFile: "",

  logLevel: "warn",
};
