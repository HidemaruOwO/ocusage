# Feature Specification: OpenCode Usage Tracker (ocusage)

**Feature Branch**: `001-opencode-usage-tracker`  
**Created**: 2025-12-31  
**Status**: Draft  
**Input**: ocmonitor互換のOpenCodeトークン使用量追跡CLIツール

## User Scenarios & Testing *(mandatory)*

### User Story 1 - セッション一覧の表示 (Priority: P1)

開発者として、OpenCodeの全セッション一覧を見たい。各セッションのトークン使用量とコストを把握し、AIコーディングの利用状況を確認するため。

**Why this priority**: これが最も基本的な機能であり、他のすべての集計・分析機能の土台となる。まずセッションを正しく読み取れなければ、何も始まらない。

**Independent Test**: セッション一覧コマンドを実行し、ローカルのOpenCodeデータから正しくセッション情報が抽出・表示されることを確認できる。

**CLI Example**:
```bash
ocusage sessions                          # 全セッション一覧
ocusage sessions --from 2025-01-01        # 期間指定
ocusage sessions --model claude-opus-4.5  # モデル指定
ocusage sessions --model anthropic/claude-opus-4.5  # モデル指定
```

**Acceptance Scenarios**:

1. **Given** OpenCodeのメッセージディレクトリが存在する, **When** セッション一覧コマンドを実行する, **Then** 全セッションがID、日時、モデル、トークン数、コストと共に一覧表示される
2. **Given** OpenCodeのメッセージディレクトリが存在しない, **When** セッション一覧コマンドを実行する, **Then** 適切なエラーメッセージが表示され、終了コード1で終了する
3. **Given** 複数のモデルを使用したセッションがある, **When** セッション一覧を表示する, **Then** 各セッションで使用されたモデル（単一または"mixed"）が正しく表示される

---

### User Story 2 - CSV/JSONエクスポート (Priority: P1)

開発者として、使用量データをCSVまたはJSON形式でエクスポートしたい。スプレッドシートや外部ツールで分析・レポート作成を行うため。

**Why this priority**: エクスポート機能はocmonitor互換の核心機能であり、外部ツール連携のために必須。出力フォーマットが決まっていれば、正しさの検証も容易。

**Independent Test**: エクスポートコマンドを実行し、指定フォーマット（CSV/JSON）でファイルが生成され、ocmonitor互換のスキーマに従っていることを確認できる。

**CLI Example**:
```bash
ocusage export --format csv --output sessions.csv
ocusage export --format json --output sessions.json
ocusage export --format csv --from 2025-01-01 --to 2025-01-31
```

**Acceptance Scenarios**:

1. **Given** セッションデータが存在する, **When** CSVエクスポートを実行する, **Then** 定義されたスキーマに従ったCSVが生成される
2. **Given** セッションデータが存在する, **When** JSONエクスポートを実行する, **Then** 定義されたスキーマに従ったJSONが生成される
3. **Given** エクスポート先パスが指定されている, **When** エクスポートを実行する, **Then** 指定パスにファイルが保存される
4. **Given** 出力先が指定されていない, **When** エクスポートを実行する, **Then** 標準出力に出力される

---

### User Story 3 - モデル別使用量集計 (Priority: P2)

開発者として、モデル別のトークン使用量とコストを見たい。どのモデルをどれだけ使っているかを把握し、コスト最適化の判断材料にするため。

**Why this priority**: セッション一覧ができれば、モデル別集計はその派生として実装可能。コスト管理において非常に有用。

**Independent Test**: モデル別集計コマンドを実行し、各モデルごとの合計トークン数とコストが正しく集計・表示されることを確認できる。

**CLI Example**:
```bash
ocusage models                            # 全期間のモデル別集計
ocusage models --from 2025-01-01          # 期間指定
```

**Acceptance Scenarios**:

1. **Given** 複数モデルのセッションデータが存在する, **When** モデル別集計コマンドを実行する, **Then** 各モデルのinput/output/cacheトークン合計とコストが表示される
2. **Given** 特定期間を指定している, **When** モデル別集計コマンドを実行する, **Then** 指定期間内のデータのみが集計される

---

### User Story 4 - 期間別集計（daily/weekly/monthly） (Priority: P2)

開発者として、日別・週別・月別のトークン使用量とコストを見たい。使用傾向を時系列で把握し、予算管理に役立てるため。

**Why this priority**: 期間集計はセッションデータのグルーピングで実現可能。ダッシュボード的な可視化の基礎となる。

**Independent Test**: 各期間集計コマンドを実行し、正しい期間でグルーピングされた集計結果が表示されることを確認できる。

**CLI Example**:
```bash
ocusage daily                             # 日別集計
ocusage weekly --from 2025-01-01          # 週別集計（期間指定）
ocusage monthly                           # 月別集計
```

**Acceptance Scenarios**:

1. **Given** 複数日にわたるセッションデータが存在する, **When** daily集計コマンドを実行する, **Then** 日別のトークン使用量とコストが表示される
2. **Given** 複数週にわたるセッションデータが存在する, **When** weekly集計コマンドを実行する, **Then** 週別の集計結果が表示される
3. **Given** 複数月にわたるセッションデータが存在する, **When** monthly集計コマンドを実行する, **Then** 月別の集計結果が表示される

---

### User Story 5 - セッション詳細表示 (Priority: P3)

開発者として、特定セッションの詳細情報を見たい。個々のセッションでのモデル使用状況やコスト内訳を詳しく分析するため。

**Why this priority**: 一覧表示ができていれば、詳細表示は追加の派生機能。デバッグや詳細分析に有用。

**Independent Test**: 特定のセッションIDを指定してコマンドを実行し、そのセッション内の全メッセージ情報が詳細に表示されることを確認できる。

**CLI Example**:
```bash
ocusage session ses_48be92eaeffepmcHE35j3U6N6f
```

**Acceptance Scenarios**:

1. **Given** 有効なセッションIDが指定されている, **When** セッション詳細コマンドを実行する, **Then** そのセッション内の全メッセージ、各メッセージのトークン使用量、コスト内訳が表示される
2. **Given** 無効なセッションIDが指定されている, **When** セッション詳細コマンドを実行する, **Then** "セッションが見つかりません"というエラーメッセージが表示され、終了コード1で終了する

---

### User Story 6 - リアルタイム表示（live） (Priority: P3)

開発者として、現在進行中のセッションの使用量をリアルタイムで監視したい。長時間のセッション中にコストを把握するため。

**Why this priority**: リアルタイム監視はファイル変更の監視と差分処理が必要で実装複雑度が高い。他の機能が安定してから実装すべき。

**Independent Test**: liveコマンドを実行し、OpenCodeが新しいメッセージを生成するたびに表示が更新されることを確認できる。

**CLI Example**:
```bash
ocusage live                              # リアルタイム監視開始
```

**Acceptance Scenarios**:

1. **Given** liveモードが起動している, **When** OpenCodeが新しいメッセージを生成する, **Then** 使用量表示が自動更新される
2. **Given** liveモードが起動している, **When** ユーザーが終了操作（Ctrl+C）を行う, **Then** 監視が停止し、累計使用量サマリーが表示される

---

### Edge Cases

- メッセージディレクトリが空の場合は「セッションが見つかりません」と表示し、終了コード0で終了
- メッセージJSONファイルが破損している場合はスキップしてstderrに警告を出力、処理は継続
- tokensフィールドがないメッセージ（user roleなど）は0として扱う
- 未知のモデルIDの場合はstderrに警告を表示し、コストは0として扱う（処理は継続）
- 非常に大きなセッション数（1000件以上）でもストリーミング処理でメモリ効率的に処理
- macOSとLinuxの両方のデフォルトパスに対応
- 期間フィルタで該当データがない場合は空の結果を返し、終了コード0で終了

## CLI Specification

### サブコマンド一覧

| コマンド | 説明 | 例 |
|---------|------|-----|
| `sessions` | セッション一覧表示 | `ocusage sessions` |
| `session <id>` | セッション詳細表示 | `ocusage session ses_xxx` |
| `models` | モデル別集計 | `ocusage models` |
| `daily` | 日別集計 | `ocusage daily` |
| `weekly` | 週別集計 | `ocusage weekly` |
| `monthly` | 月別集計 | `ocusage monthly` |
| `export` | CSV/JSONエクスポート | `ocusage export --format csv` |
| `live` | リアルタイム監視 | `ocusage live` |

### 共通フラグ

| フラグ | 短縮 | 説明 | デフォルト |
|-------|------|------|-----------|
| `--from <date>` | `-f` | 開始日（YYYY-MM-DD） | なし（全期間） |
| `--to <date>` | `-t` | 終了日（YYYY-MM-DD） | なし（全期間） |
| `--model <name>` | `-m` | モデル名でフィルタ | なし（全モデル） |
| `--path <dir>` | `-p` | メッセージディレクトリ | 環境依存デフォルト |
| `--config <file>` | `-c` | 設定ファイルパス | `~/.config/ocusage/config.toml` |
| `--output <file>` | `-o` | 出力ファイル（exportのみ） | stdout |
| `--format <fmt>` | | 出力形式（csv/json） | csv |
| `--sort <field>` | `-s` | ソート対象（date/cost/tokens） | date |
| `--order <dir>` | | ソート順（asc/desc） | desc |
| `--help` | `-h` | ヘルプ表示 | - |
| `--version` | `-v` | バージョン表示 | - |

### 終了コード

| コード | 意味 |
|--------|------|
| 0 | 正常終了 |
| 1 | 一般エラー（ディレクトリ不在、セッション不在など） |
| 2 | 引数/設定エラー（不正なフラグ、日付形式エラーなど） |

### 出力形式

- 一覧表示: タブ区切りテーブル（ヘッダ行あり）
- 詳細表示: 構造化テキスト（キー: 値形式）
- エクスポート: CSV/JSON（下記スキーマ参照）

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: システムは以下の優先順位でメッセージディレクトリを解決しなければならない:
  1. コマンド引数 `--path`
  2. 環境変数 `OCUSAGE_MESSAGES_DIR`
  3. 設定ファイル `messages_dir`
  4. デフォルトパス（後述）
- **FR-002**: デフォルトパスはOS別に以下を使用する:
  - Linux: `~/.local/share/opencode/storage/message`
  - macOS: `~/.local/share/opencode/storage/message`（XDG準拠）
- **FR-003**: システムはセッション一覧を表示し、各セッションのID、日時、モデル、トークン数、コストを出力しなければならない
- **FR-004**: システムはCSVおよびJSON形式でデータをエクスポートできなければならない
- **FR-005**: システムは `--from` / `--to` フラグで期間フィルタリングを提供しなければならない
- **FR-006**: システムは `--model` フラグでモデル名によるフィルタリングを提供しなければならない
- **FR-007**: システムはモデル別の使用量集計を表示できなければならない
- **FR-008**: システムは日別（daily）、週別（weekly）、月別（monthly）の期間集計を表示できなければならない
- **FR-009**: システムは特定セッションの詳細情報を表示できなければならない
- **FR-010**: システムはリアルタイムで使用量を監視・表示できなければならない（liveモード）
- **FR-011**: システムはmodels.jsonからモデル単価情報を読み込み、コスト計算に使用しなければならない
- **FR-012**: システムはinput tokens、output tokens、cache tokens（read/write合算）を区別して集計しなければならない
- **FR-013**: コスト計算は `tokens / 1,000,000 * cost_per_million` の式で行わなければならない
- **FR-014**: cache tokensのコストは以下の優先順位で計算する:
  1. models.jsonに `cache_cost_per_million` があればそれを使用
  2. なければ `input_cost_per_million` を流用
- **FR-015**: 1セッションで複数モデルが使用されている場合:
  - セッション一覧のmodel列は "mixed" と表示
  - モデル別集計ではメッセージ単位で各modelIDに加算（按分ではなく実値）
- **FR-016**: システムは `--sort` / `--order` フラグでソート順を制御できなければならない

### Key Entities

- **Session**: OpenCodeの1セッションを表す。セッションIDはディレクトリ名（ses_で始まる）から取得。開始時刻・終了時刻は配下メッセージの最小・最大created時刻から算出。
- **Message**: 1つのAPI呼び出しを表す。id, sessionID, role, time（created, completed）, modelID, providerID, tokens（input, output, reasoning, cache）を持つ。
- **Model**: モデル定義。model_key, input_cost_per_million, output_cost_per_million, cache_cost_per_million（任意）, context_window, descriptionを持つ。
- **UsageSummary**: 集計結果。input_tokens, output_tokens, cache_tokens（read+write合算）, input_cost, output_cost, cache_cost, total_costを持つ。

## Output Schema

### CSV出力スキーマ

列順序と型:

| 列名 | 型 | 説明 |
|------|-----|------|
| session_id | string | セッションID（例: ses_xxx） |
| date | string | セッション開始日（YYYY-MM-DD、ローカルTZ） |
| start_time | string | 開始時刻（HH:MM:SS、ローカルTZ） |
| end_time | string | 終了時刻（HH:MM:SS、ローカルTZ） |
| duration_minutes | number | セッション時間（分、小数点1桁） |
| model | string | 使用モデル（単一）または "mixed" |
| input_tokens | integer | 入力トークン合計 |
| output_tokens | integer | 出力トークン合計 |
| cache_tokens | integer | キャッシュトークン合計（read + write） |
| total_cost | number | 総コスト（USD、小数点4桁） |

**注意**: `cache_tokens`は内部で`cache.read + cache.write`を合算した値。

### JSON出力スキーマ

```json
{
  "metadata": {
    "export_date": "2025-12-31T12:00:00+09:00",
    "tool_version": "0.1.0",
    "total_sessions": 42,
    "date_range": {
      "start": "2025-01-01",
      "end": "2025-12-31"
    }
  },
  "sessions": [
    {
      "session_id": "ses_xxx",
      "date": "2025-12-31",
      "start_time": "10:30:00",
      "end_time": "11:45:30",
      "duration_minutes": 75.5,
      "model": "claude-opus-4.5",
      "tokens": {
        "input": 50000,
        "output": 10000,
        "cache": 5000
      },
      "cost": {
        "input": 0.15,
        "output": 0.15,
        "cache": 0.015,
        "total": 0.315
      }
    }
  ]
}
```

- `export_date`: ISO 8601形式（ローカルTZオフセット付き）
- `date_range.start/end`: YYYY-MM-DD形式
- `duration_minutes`: 小数点1桁
- `cost.*`: 小数点4桁

### models.json スキーマ

```json
{
  "claude-opus-4.5": {
    "input_cost_per_million": 15.0,
    "output_cost_per_million": 75.0,
    "cache_cost_per_million": 1.5,
    "context_window": 200000,
    "description": "Claude Opus 4.5"
  },
  "anthropic/claude-opus-4.5": {
    "input_cost_per_million": 15.0,
    "output_cost_per_million": 75.0,
    "cache_cost_per_million": 1.5,
    "context_window": 200000,
    "description": "Claude Opus 4.5 (fully qualified)"
  }
}
```

- `cache_cost_per_million`: 任意フィールド（なければinput単価を流用）
- 同一モデルの短縮名と完全修飾名の両方を登録可能

### models.json の所在

以下の優先順位で解決:

1. 環境変数 `OCUSAGE_MODELS_FILE`
2. 設定ファイル `models_file`
3. デフォルト: `~/.config/ocusage/models.json`

models.jsonが存在しない場合は警告を出力し、全モデルのコストを0として計算。

## Time & Period Definitions

### タイムゾーン

- すべての日時はシステムのローカルタイムゾーンで解釈・表示
- 内部ではUnix epoch（ミリ秒）で処理

### 日付境界

- 日の開始: 00:00:00 ローカルTZ
- 日の終了: 23:59:59.999 ローカルTZ

### 週の定義

- 週の起点: 月曜日（ISO 8601準拠）
- 週番号: ISO週番号を使用

### 期間集計の帰属

- セッションは**開始時刻**の属する期間に帰属
- 例: 23:50開始、翌日00:30終了のセッション → 開始日に帰属

### duration算出

- `duration_minutes = (最終メッセージcreated - 最初メッセージcreated) / 60000`
- メッセージが1件のみの場合: `duration_minutes = 0`

## Cost Calculation

### 計算式

```
input_cost  = input_tokens  / 1,000,000 * input_cost_per_million
output_cost = output_tokens / 1,000,000 * output_cost_per_million
cache_cost  = cache_tokens  / 1,000,000 * cache_cost_per_million
total_cost  = input_cost + output_cost + cache_cost
```

### 丸め規則

- 内部計算: 浮動小数点（倍精度）で計算、丸めなし
- 表示/出力: 小数点以下4桁で四捨五入（0.00005 → 0.0001）
- 集計の丸め: 個別コストを丸めてから合計（丸め誤差を最小化）

### 通貨

- コストはすべてUSD（米ドル）単位
- 表示時に通貨記号は付けない（数値のみ）

## Error Handling & Logging

### エラー出力

- エラーメッセージ: stderr
- 通常出力: stdout
- ログレベル: 環境変数 `OCUSAGE_LOG_LEVEL`（debug/info/warn/error、デフォルト: warn）

### エラー種別と対応

| エラー | 対応 | 終了コード |
|--------|------|-----------|
| メッセージディレクトリ不在 | エラー終了 | 1 |
| セッション不在（指定ID） | エラー終了 | 1 |
| JSONパースエラー（個別ファイル） | 警告出力、スキップ、処理継続 | 0 |
| 未知のモデルID | 警告出力、コスト0で計算、処理継続 | 0 |
| models.json不在 | 警告出力、全コスト0で計算、処理継続 | 0 |
| 無効な日付形式 | エラー終了 | 2 |
| 不正なフラグ | エラー終了 | 2 |

### 警告メッセージ形式

```
[WARN] Skipping corrupted file: msg_xxx.json (invalid JSON)
[WARN] Unknown model: gpt-4-unknown (cost set to 0)
[WARN] models.json not found at ~/.config/ocusage/models.json (all costs set to 0)
```

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: ユーザーは1コマンドで全セッションの使用量一覧を3秒以内に確認できる（100セッション以下の場合）
- **SC-002**: エクスポートされたCSV/JSONファイルは上記スキーマに従い、ocmonitor互換ツールで読み込み可能
- **SC-003**: 1000セッション以上のデータでもストリーミング処理により、メモリ使用量がセッション数に比例せず一定（O(1)に近い）
- **SC-004**: コスト計算は内部で倍精度浮動小数点、出力時は小数点4桁で四捨五入
- **SC-005**: 主要ユースケース（一覧表示、期間集計、エクスポート）は1コマンドで実行可能
- **SC-006**: 初回セットアップから最初のコマンド実行まで1分以内で完了可能

## Assumptions

- OpenCodeのメッセージ保存形式は現在確認されたスキーマ（JSON形式、msg_*.json）から変更されないと仮定
- セッションIDのフォーマットは`ses_`で始まるランダム文字列（ocmonitorの`ses_YYYYMMDD_HHMMSS`とは異なる）
- メッセージのtimestampはUnix epoch（ミリ秒）形式
- tokensフィールドはassistant roleのメッセージにのみ存在
- cache tokensはread/writeに分かれている（出力時は合算）
- reasoningトークンは現時点では常に0だが、将来のためにスキーマには含める
- costフィールドがメッセージに含まれているが0のため、自前でコスト計算が必要

## Data Source Schema (Confirmed)

OpenCodeのメッセージJSONスキーマ（実データから確認済み）:

```json
{
  "id": "msg_<random>",
  "sessionID": "ses_<random>",
  "role": "user" | "assistant",
  "time": {
    "created": <unix_epoch_ms>,
    "completed": <unix_epoch_ms>
  },
  "modelID": "<model_name>",
  "providerID": "<provider_name>",
  "tokens": {
    "input": <number>,
    "output": <number>,
    "reasoning": <number>,
    "cache": {
      "read": <number>,
      "write": <number>
    }
  },
  "cost": 0,
  "finish": "tool-calls" | "stop" | ...
}
```

**注意**: `tokens`フィールドと`time.completed`は`assistant` roleのメッセージにのみ存在します。`user` roleのメッセージにはこれらのフィールドがありません。

## Technical Requirements

### Runtime

- **TR-001**: ランタイムはBunを使用する（Node.js/Denoとの互換性は考慮しない）
- **TR-002**: Bun APIを最優先で使用する:
  - ファイル読み込み: `Bun.file()`, `Bun.read()`
  - ファイル書き込み: `Bun.write()`
  - JSON解析: `Bun.file().json()`
  - ディレクトリ走査: `Bun.Glob`
  - 環境変数: `Bun.env`
- **TR-003**: Node.js互換API（`fs`, `path`等）はBun APIで代替できない場合のみ使用可

### Language & Tooling

- **TR-004**: TypeScriptを使用し、`strict`モードを有効にする
- **TR-005**: Linter/FormatterにはBiomeを使用する（ESLint/Prettierは使用しない）
- **TR-006**: importパスには`@`プレフィックスのエイリアスを使用する（例: `@/models/session`）
- **TR-007**: テストには`bun test`を使用する

### CLI Framework

- **TR-008**: CLIフレームワークにはgunshiを使用する
- **TR-009**: ログ出力にはconsolaを使用する

### Bun API Usage Examples

```typescript
// ファイル読み込み
const content = await Bun.file(path).text()
const json = await Bun.file(path).json()

// ファイル書き込み
await Bun.write(path, content)

// ディレクトリ走査
const glob = new Bun.Glob('**/*.json')
for await (const file of glob.scan(dir)) {
  // ...
}

// 環境変数
const logLevel = Bun.env.OCUSAGE_LOG_LEVEL ?? 'warn'
```
