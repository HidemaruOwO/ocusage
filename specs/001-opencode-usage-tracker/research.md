# Research: OpenCode Usage Tracker (ocusage)

**Feature Branch**: `001-opencode-usage-tracker`  
**Created**: 2025-12-31  
**Status**: Complete

## 1. Runtime & Package Manager

### Decision: Bun (exclusive)

**Rationale**:

- ユーザー要件で明示的に指定
- TypeScriptネイティブサポート（tsconfigのみで動作）
- 高速な起動時間（CLIに最適）
- 内蔵テストランナー（`bun test`）
- ファイルAPI（`Bun.file()`）が組み込み

**Important**: Node.js/Denoとの互換性は考慮しない。Bun専用として開発する。

**Bun API Priority**:
| 用途 | Bun API | Node.js互換 (使用しない) |
|------|---------|-------------------------|
| ファイル読み込み | `Bun.file().text()`, `Bun.file().json()` | `fs.readFile` |
| ファイル書き込み | `Bun.write()` | `fs.writeFile` |
| Glob走査 | `new Bun.Glob().scan()` | `glob` package |
| 環境変数 | `Bun.env` | `process.env` |
| パス操作 | `import.meta.dir`, `import.meta.path` | `__dirname`, `__filename` |

**Alternatives Considered**:

- Node.js + tsx: 互換性不要のため却下
- Deno: 互換性不要のため却下

## 2. CLI Framework

### Decision: gunshi

**Rationale**:

- ユーザー要件で明示的に指定
- 型安全なコマンド定義（`define()`関数）
- サブコマンドの階層構造をサポート
- 位置引数（positional arguments）サポート
- 遅延読み込み（`lazy()`）による高速起動
- 自動ヘルプ生成

**Key Patterns**:

```typescript
import { cli, define } from "gunshi";

// コマンド定義
const sessionsCommand = define({
  name: "sessions",
  description: "List all sessions",
  args: {
    from: {
      type: "string",
      short: "f",
      description: "Start date (YYYY-MM-DD)",
    },
    to: { type: "string", short: "t", description: "End date (YYYY-MM-DD)" },
    model: { type: "string", short: "m", description: "Filter by model" },
    path: { type: "string", short: "p", description: "Messages directory" },
  },
  run: (ctx) => {
    const { from, to, model, path } = ctx.values;
    // 実装
  },
});

// 位置引数の例（session詳細）
const sessionCommand = define({
  name: "session",
  description: "Show session details",
  args: {
    id: { type: "positional", description: "Session ID" },
  },
  run: (ctx) => {
    const { id } = ctx.values;
    // 実装
  },
});

// CLIエントリポイント
await cli(process.argv.slice(2), mainCommand, {
  name: "ocusage",
  version: "0.1.0",
  subCommands: { sessions: sessionsCommand, session: sessionCommand },
});
```

**Official URL**: https://github.com/kazupon/gunshi

## 3. Linter & Formatter

### Decision: Biome

**Rationale**:

- ユーザー要件で明示的に指定
- ESLint + Prettierの代替として高速
- 単一ツールでlint + format
- TypeScript対応がネイティブ

**Configuration** (`biome.json`):

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "formatter": {
    "enabled": true,
    "indentStyle": "tab",
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "style": {
        "noVar": "error",
        "useConst": "error"
      },
      "correctness": {
        "noUnusedVariables": "error",
        "noUnusedImports": "error"
      }
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingCommas": "all"
    }
  },
  "files": {
    "ignore": ["node_modules", "dist"]
  }
}
```

**Commands**:

- Lint: `bun x biome lint .`
- Format: `bun x biome format --write .`
- Check: `bun x biome check .`

**Official URL**: https://biomejs.dev/

## 4. Logging

### Decision: consola

**Rationale**:

- ユーザー要件で明示的に指定
- 美しいコンソール出力
- ログレベルサポート
- TypeScript対応

**Usage Pattern**:

```typescript
import consola from "consola";

// ログレベル設定
consola.level = process.env.OCUSAGE_LOG_LEVEL === "debug" ? 4 : 2;

consola.info("Processing sessions...");
consola.warn("Unknown model: gpt-4-unknown (cost set to 0)");
consola.error("Messages directory not found");
consola.debug("Parsed message:", message);
```

**Official URL**: https://github.com/unjs/consola

## 5. Path Alias

### Decision: `@` プレフィックス

**Rationale**:

- ユーザー要件で明示的に指定
- 相対パスの複雑さを回避
- モジュール構造の明確化

**Configuration** (`tsconfig.json`):

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

**Usage**:

```typescript
import { Session } from "@/models/session";
import { parseMessages } from "@/services/parser";
import { formatTable } from "@/lib/formatter";
```

## 6. Project Structure

### Decision: Single project (CLI focused)

```
src/
├── index.ts              # CLIエントリポイント
├── commands/             # gunshiコマンド定義
│   ├── sessions.ts
│   ├── session.ts
│   ├── models.ts
│   ├── daily.ts
│   ├── weekly.ts
│   ├── monthly.ts
│   ├── export.ts
│   └── live.ts
├── models/               # データモデル（型定義）
│   ├── session.ts
│   ├── message.ts
│   ├── model.ts
│   └── usage.ts
├── services/             # ビジネスロジック
│   ├── parser.ts         # メッセージJSONパース
│   ├── aggregator.ts     # 集計ロジック
│   ├── cost.ts           # コスト計算
│   └── config.ts         # 設定読み込み
└── lib/                  # ユーティリティ
    ├── formatter.ts      # テーブル/出力フォーマット
    ├── date.ts           # 日付処理
    └── fs.ts             # ファイルシステムヘルパー

tests/
├── unit/
│   ├── parser.test.ts
│   ├── aggregator.test.ts
│   └── cost.test.ts
└── integration/
    └── cli.test.ts
```

## 7. Dependencies Summary

### Production Dependencies

| Package | Version | Purpose       |
| ------- | ------- | ------------- |
| gunshi  | ^0.x    | CLI framework |
| consola | ^3.x    | Logging       |

### Development Dependencies

| Package        | Version | Purpose              |
| -------------- | ------- | -------------------- |
| @biomejs/biome | ^1.9    | Linter/Formatter     |
| typescript     | ^5.x    | Type checking        |
| @types/bun     | latest  | Bun type definitions |

## 8. Configuration Files

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "types": ["bun-types"]
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules"]
}
```

### package.json (scripts)

```json
{
  "name": "ocusage",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "ocusage": "./src/index.ts"
  },
  "scripts": {
    "dev": "bun run src/index.ts",
    "build": "bun build src/index.ts --outdir dist --target bun",
    "test": "bun test",
    "lint": "biome lint .",
    "format": "biome format --write .",
    "check": "biome check ."
  }
}
```

## 9. Bun API Best Practices

### ファイル操作

```typescript
// ✅ Good: Bun API
const content = await Bun.file(path).text();
const data = await Bun.file(path).json();
await Bun.write(outputPath, content);

// ❌ Bad: Node.js互換API（使用しない）
import { readFile, writeFile } from "fs/promises";
const content = await readFile(path, "utf-8");
```

### ディレクトリ走査

```typescript
// ✅ Good: Bun.Glob
const glob = new Bun.Glob("**/msg_*.json");
for await (const file of glob.scan({ cwd: messagesDir, absolute: true })) {
  const message = await Bun.file(file).json();
}

// ❌ Bad: 外部globパッケージ（使用しない）
import { glob } from "glob";
```

### 環境変数

```typescript
// ✅ Good: Bun.env
const logLevel = Bun.env.OCUSAGE_LOG_LEVEL ?? "warn";
const messagesDir = Bun.env.OCUSAGE_MESSAGES_DIR;

// ❌ Bad: process.env（使用しない）
const logLevel = process.env.OCUSAGE_LOG_LEVEL;
```

### パス操作

```typescript
// ✅ Good: import.meta
const currentDir = import.meta.dir;
const currentFile = import.meta.path;

// ❌ Bad: __dirname（使用しない）
const currentDir = __dirname;
```

### ファイル存在確認

```typescript
// ✅ Good: Bun.file().exists()
const exists = await Bun.file(path).exists();

// ❌ Bad: fs.access（使用しない）
import { access } from "fs/promises";
```

## 10. Resolved Clarifications

| Item             | Resolution                                |
| ---------------- | ----------------------------------------- |
| CLI Framework    | gunshi（ユーザー指定）                    |
| Logging          | consola（ユーザー指定）                   |
| Linter/Formatter | Biome（ユーザー指定）                     |
| Path Alias       | `@` prefix（ユーザー指定）                |
| Runtime          | Bun専用（Node.js/Deno互換性なし）         |
| Test Framework   | bun test（Bun組み込み）                   |
| Storage          | N/A（ファイルシステム読み込みのみ）       |
| File API         | Bun API優先（Node.js互換APIは使用しない） |
