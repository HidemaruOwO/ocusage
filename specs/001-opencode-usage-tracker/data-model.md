# Data Model: OpenCode Usage Tracker (ocusage)

**Feature Branch**: `001-opencode-usage-tracker`  
**Created**: 2025-12-31  
**Status**: Complete

## Entity Relationship

```
┌─────────────────┐
│     Session     │
│─────────────────│
│ id              │
│ startTime       │
│ endTime         │
│ model           │
│ messages[]      │───────┐
│ usage           │       │
└─────────────────┘       │
                          │ 1:N
                          ▼
                   ┌─────────────────┐
                   │     Message     │
                   │─────────────────│
                   │ id              │
                   │ sessionID       │
                   │ role            │
                   │ time            │
                   │ modelID         │
                   │ providerID      │
                   │ tokens          │
                   │ cost            │
                   └─────────────────┘

┌─────────────────┐       ┌─────────────────┐
│   ModelConfig   │       │  UsageSummary   │
│─────────────────│       │─────────────────│
│ modelKey        │       │ inputTokens     │
│ inputCost       │       │ outputTokens    │
│ outputCost      │       │ cacheTokens     │
│ cacheCost       │       │ inputCost       │
│ contextWindow   │       │ outputCost      │
│ description     │       │ cacheCost       │
└─────────────────┘       │ totalCost       │
                          └─────────────────┘
```

## Type Definitions

### Message (入力データ)

OpenCodeが生成するメッセージJSONの型定義。

```typescript
/** メッセージの時間情報 */
interface MessageTime {
  /** メッセージ作成時刻 (Unix epoch ms) */
  created: number
  /** メッセージ完了時刻 (Unix epoch ms) - assistantのみ */
  completed?: number
}

/** キャッシュトークン情報 */
interface CacheTokens {
  read: number
  write: number
}

/** トークン使用量 */
interface TokenUsage {
  input: number
  output: number
  reasoning: number
  cache: CacheTokens
}

/** メッセージロール */
type MessageRole = 'user' | 'assistant'

/** OpenCodeメッセージ */
interface Message {
  /** メッセージID (msg_xxx形式) */
  id: string
  /** セッションID (ses_xxx形式) */
  sessionID: string
  /** メッセージロール */
  role: MessageRole
  /** 時間情報 */
  time: MessageTime
  /** モデルID */
  modelID: string
  /** プロバイダーID */
  providerID: string
  /** トークン使用量 - assistantのみ */
  tokens?: TokenUsage
  /** コスト（常に0、自前計算が必要） */
  cost: number
  /** 完了理由 */
  finish?: string
}
```

### Session (集計単位)

セッション単位の集計データ。

```typescript
/** セッション情報 */
interface Session {
  /** セッションID (ses_xxx形式) */
  id: string
  /** セッション開始時刻 (Unix epoch ms) */
  startTime: number
  /** セッション終了時刻 (Unix epoch ms) */
  endTime: number
  /** 使用モデル（単一モデルまたは "mixed"） */
  model: string
  /** セッション内のメッセージ一覧 */
  messages: Message[]
  /** 使用量サマリー */
  usage: UsageSummary
}

/** セッション時間（分単位） */
function getSessionDurationMinutes(session: Session): number {
  return (session.endTime - session.startTime) / 60000
}
```

### UsageSummary (集計結果)

トークン使用量とコストの集計結果。

```typescript
/** 使用量サマリー */
interface UsageSummary {
  /** 入力トークン合計 */
  inputTokens: number
  /** 出力トークン合計 */
  outputTokens: number
  /** キャッシュトークン合計 (read + write) */
  cacheTokens: number
  /** 入力コスト (USD) */
  inputCost: number
  /** 出力コスト (USD) */
  outputCost: number
  /** キャッシュコスト (USD) */
  cacheCost: number
  /** 総コスト (USD) */
  totalCost: number
}

/** 空のUsageSummary */
function createEmptyUsageSummary(): UsageSummary {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheTokens: 0,
    inputCost: 0,
    outputCost: 0,
    cacheCost: 0,
    totalCost: 0,
  }
}

/** UsageSummaryの合算 */
function mergeUsageSummaries(a: UsageSummary, b: UsageSummary): UsageSummary {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheTokens: a.cacheTokens + b.cacheTokens,
    inputCost: a.inputCost + b.inputCost,
    outputCost: a.outputCost + b.outputCost,
    cacheCost: a.cacheCost + b.cacheCost,
    totalCost: a.totalCost + b.totalCost,
  }
}
```

### ModelConfig (モデル設定)

モデル単価情報。

```typescript
/** モデル設定 */
interface ModelConfig {
  /** 入力トークン単価 (USD per million) */
  inputCostPerMillion: number
  /** 出力トークン単価 (USD per million) */
  outputCostPerMillion: number
  /** キャッシュトークン単価 (USD per million) - 任意 */
  cacheCostPerMillion?: number
  /** コンテキストウィンドウサイズ */
  contextWindow: number
  /** モデル説明 */
  description: string
}

/** モデル設定マップ */
type ModelConfigMap = Record<string, ModelConfig>

/** キャッシュコストを取得（未設定時はinputコストを使用） */
function getCacheCostPerMillion(config: ModelConfig): number {
  return config.cacheCostPerMillion ?? config.inputCostPerMillion
}
```

### Config (アプリケーション設定)

```typescript
/** アプリケーション設定 */
interface AppConfig {
  /** メッセージディレクトリパス */
  messagesDir: string
  /** models.jsonパス */
  modelsFile: string
  /** ログレベル */
  logLevel: 'debug' | 'info' | 'warn' | 'error'
}

/** デフォルト設定 */
const DEFAULT_CONFIG: AppConfig = {
  messagesDir: `${Bun.env.HOME}/.local/share/opencode/storage/message`,
  modelsFile: `${Bun.env.HOME}/.config/ocusage/models.json`,
  logLevel: 'warn',
}
```

## Validation Rules

### Message Validation

```typescript
/** メッセージの妥当性検証 */
function isValidMessage(data: unknown): data is Message {
  if (typeof data !== 'object' || data === null) return false
  
  const msg = data as Record<string, unknown>
  
  // 必須フィールド
  if (typeof msg.id !== 'string') return false
  if (typeof msg.sessionID !== 'string') return false
  if (msg.role !== 'user' && msg.role !== 'assistant') return false
  if (typeof msg.time !== 'object' || msg.time === null) return false
  
  const time = msg.time as Record<string, unknown>
  if (typeof time.created !== 'number') return false
  
  return true
}
```

### Token Extraction

```typescript
/** メッセージからトークン使用量を抽出 */
function extractTokens(message: Message): TokenUsage | null {
  // userロールにはtokensがない
  if (message.role === 'user') return null
  if (!message.tokens) return null
  
  return {
    input: message.tokens.input ?? 0,
    output: message.tokens.output ?? 0,
    reasoning: message.tokens.reasoning ?? 0,
    cache: {
      read: message.tokens.cache?.read ?? 0,
      write: message.tokens.cache?.write ?? 0,
    },
  }
}
```

## State Transitions

### Session States

```
[File Discovery] → [Message Parsing] → [Session Building] → [Aggregation]
```

1. **File Discovery**: Bun.Globでmsg_*.jsonを走査
2. **Message Parsing**: 各JSONファイルをパース（エラー時はスキップ）
3. **Session Building**: sessionIDでグルーピング
4. **Aggregation**: トークン集計・コスト計算

### Error States

| 状態 | 処理 | 終了コード |
|------|------|-----------|
| ディレクトリ不在 | エラー終了 | 1 |
| JSONパースエラー | 警告＆スキップ | 0 |
| 未知のモデル | 警告＆コスト0 | 0 |
| models.json不在 | 警告＆全コスト0 | 0 |

## Output Schemas

### CSV Row

```typescript
interface CsvRow {
  session_id: string
  date: string           // YYYY-MM-DD
  start_time: string     // HH:MM:SS
  end_time: string       // HH:MM:SS
  duration_minutes: number
  model: string
  input_tokens: number
  output_tokens: number
  cache_tokens: number
  total_cost: number
}
```

### JSON Export

```typescript
interface JsonExport {
  metadata: {
    export_date: string  // ISO 8601
    tool_version: string
    total_sessions: number
    date_range: {
      start: string      // YYYY-MM-DD
      end: string        // YYYY-MM-DD
    }
  }
  sessions: SessionExport[]
}

interface SessionExport {
  session_id: string
  date: string
  start_time: string
  end_time: string
  duration_minutes: number
  model: string
  tokens: {
    input: number
    output: number
    cache: number
  }
  cost: {
    input: number
    output: number
    cache: number
    total: number
  }
}
```
