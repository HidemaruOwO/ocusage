import { describe, expect, test } from "bun:test";
import { dirExists, expandPath, fileExists } from "../../../src/lib/fs";

const toPath = (relativePath: string): string => {
  return decodeURIComponent(new URL(relativePath, import.meta.url).pathname);
};

describe("fs utilities", () => {
  test("expandPath expands home", () => {
    const home = Bun.env.HOME ?? Bun.env.USERPROFILE;
    if (!home) return;

    const base = home.endsWith("/") ? home.slice(0, -1) : home;
    expect(expandPath("~")).toBe(home);
    expect(expandPath("~/test")).toBe(`${base}/test`);
  });

  test("fileExists resolves existing file", async () => {
    const pkgPath = toPath("../../../package.json");
    expect(await fileExists(pkgPath)).toBe(true);
  });

  test("dirExists resolves directories", async () => {
    const srcPath = toPath("../../../src");
    const missingPath = toPath("../../../__missing_dir__");
    expect(await dirExists(srcPath)).toBe(true);
    expect(await dirExists(missingPath)).toBe(false);
  });
});
