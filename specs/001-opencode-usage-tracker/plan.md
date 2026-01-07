# Implementation Plan: OpenCode Usage Tracker (ocusage)

**Branch**: `001-opencode-usage-tracker` | **Date**: 2025-12-31 | **Spec**: [spec.md](../spec.md)
**Input**: Feature specification from `/specs/spec.md`

## Summary

OpenCodeのトークン使用量を追跡・分析するCLIツール。Bunランタイム専用で開発し、gunshiをCLIフレームワーク、consolaをロギングに使用。日別/週別/月別の集計、モデル別分析、CSV/JSONエクスポート機能を提供。

## Technical Context

**Language/Version**: TypeScript 5.x on Bun 1.x (Bun専用、Node.js/Deno互換性なし)  
**Primary Dependencies**: gunshi (CLI), consola (logging)  
**Storage**: N/A (ファイルシステム読み込みのみ)  
**Testing**: bun test  
**Target Platform**: macOS, Linux (Bun対応環境)  
**Project Type**: Single project (CLI focused)  
**Performance Goals**: 100セッション以下で3秒以内のレスポンス  
**Constraints**: O(1)に近いメモリ使用量（ストリーミング処理）  
**Scale/Scope**: 1000セッション以上対応

### Bun API Priority

| 用途             | 使用するAPI                              |
| ---------------- | ---------------------------------------- |
| ファイル読み込み | `Bun.file().text()`, `Bun.file().json()` |
| ファイル書き込み | `Bun.write()`                            |
| Glob走査         | `new Bun.Glob().scan()`                  |
| 環境変数         | `Bun.env`                                |
| パス操作         | `import.meta.dir`, `import.meta.path`    |

### Tooling

| ツール     | 用途                                     |
| ---------- | ---------------------------------------- |
| Biome      | Linter/Formatter (ESLint/Prettier不使用) |
| `@` prefix | import path alias                        |
| bun test   | テストフレームワーク                     |

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle     | Status     | Notes                                |
| ------------- | ---------- | ------------------------------------ |
| Library-First | ✅ Pass    | CLIツールとして自己完結              |
| CLI Interface | ✅ Pass    | stdin/args → stdout, errors → stderr |
| Test-First    | ⏳ Pending | 実装フェーズで適用                   |
| Observability | ✅ Pass    | consola使用、OCUSAGE_LOG_LEVEL対応   |
| Simplicity    | ✅ Pass    | 単一プロジェクト構成                 |

## Project Structure

### Documentation (this feature)

```text
specs/001-opencode-usage-tracker/
├── plan.md              # This file
├── research.md          # Phase 0 output ✅
├── data-model.md        # Phase 1 output ✅
├── quickstart.md        # Phase 1 output ✅
├── contracts/           # Phase 1 output ✅
│   └── cli.md           # CLI contract
└── tasks.md             # Phase 2 output (NOT created by this phase)
```

### Source Code (repository root)

```text
src/
├── index.ts              # CLIエントリポイント
├── commands/             # gunshiコマンド定義
│   ├── sessions.ts       # セッション一覧
│   ├── session.ts        # セッション詳細
│   ├── models.ts         # モデル別集計
│   ├── daily.ts          # 日別集計
│   ├── weekly.ts         # 週別集計
│   ├── monthly.ts        # 月別集計
│   ├── export.ts         # CSV/JSONエクスポート
│   └── live.ts           # リアルタイム監視
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

**Structure Decision**: Single project (CLI focused) を選択。CLIツールとして自己完結し、追加のfrontend/backendは不要。

## Dependencies

### Production

| Package | Version | Purpose       |
| ------- | ------- | ------------- |
| gunshi  | ^0.x    | CLI framework |
| consola | ^3.x    | Logging       |

### Development

| Package        | Version | Purpose              |
| -------------- | ------- | -------------------- |
| @biomejs/biome | ^1.9    | Linter/Formatter     |
| typescript     | ^5.x    | Type checking        |
| @types/bun     | latest  | Bun type definitions |

## Complexity Tracking

> **No violations detected.** 単一プロジェクト構成で、全ての原則に準拠。

## Phase Outputs

| Phase   | Output           | Status                  |
| ------- | ---------------- | ----------------------- |
| Phase 0 | research.md      | ✅ Complete             |
| Phase 1 | data-model.md    | ✅ Complete             |
| Phase 1 | contracts/cli.md | ✅ Complete             |
| Phase 1 | quickstart.md    | ✅ Complete             |
| Phase 2 | tasks.md         | ⏳ Pending (別コマンド) |
