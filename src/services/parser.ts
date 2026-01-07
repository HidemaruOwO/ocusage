import { consola } from "consola";
import type { Message } from "@/models";

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

export const isValidMessage = (data: unknown): data is Message => {
  if (!isRecord(data)) return false;
  if (typeof data.id !== "string") return false;
  if (typeof data.sessionID !== "string") return false;
  if (data.role !== "user" && data.role !== "assistant") return false;
  if (!isRecord(data.time)) return false;

  const time = data.time as Record<string, unknown>;
  if (typeof time.created !== "number") return false;

  return true;
};

const getFileLabel = (filePath: string): string => {
  const parts = filePath.split(/[/\\]/);
  return parts[parts.length - 1] ?? filePath;
};

export const parseMessageFile = async (
  filePath: string,
): Promise<Message | null> => {
  try {
    const data = await Bun.file(filePath).json();
    if (!isValidMessage(data)) {
      consola.warn(`Skipping invalid message file: ${getFileLabel(filePath)}`);
      return null;
    }
    return data;
  } catch (error) {
    consola.warn(
      `Skipping corrupted file: ${getFileLabel(filePath)} (invalid JSON)`,
    );
    consola.debug(error);
    return null;
  }
};

export async function* scanMessages(
  messagesDir: string,
): AsyncGenerator<Message> {
  const glob = new Bun.Glob("**/msg_*.json");
  for await (const filePath of glob.scan({
    cwd: messagesDir,
    absolute: true,
  })) {
    const message = await parseMessageFile(filePath);
    if (message) {
      yield message;
    }
  }
}
