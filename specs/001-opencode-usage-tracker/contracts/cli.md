# CLI Contract: ocusage

**Version**: 0.1.0  
**Created**: 2025-12-31

## Overview

ocusageはOpenCodeのトークン使用量を追跡・分析するCLIツールです。

## Command Structure

```
ocusage <command> [options]
```

## Commands

### sessions

セッション一覧を表示します。

```
ocusage sessions [options]
```

**Options**:
| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| --from | -f | date | - | 開始日 (YYYY-MM-DD) |
| --to | -t | date | - | 終了日 (YYYY-MM-DD) |
| --model | -m | string | - | モデル名でフィルタ |
| --path | -p | path | auto | メッセージディレクトリ |
| --sort | -s | field | date | ソート対象 (date/cost/tokens) |
| --order | - | dir | desc | ソート順 (asc/desc) |

**Output** (stdout):
```
SESSION_ID                         DATE         START     END       DURATION  MODEL              INPUT      OUTPUT     CACHE      COST
ses_48be92eaeffepmcHE35j3U6N6f    2025-12-31   10:30:00  11:45:30  75.5min   claude-opus-4.5    50000      10000      5000       $0.3150
ses_abc123def456ghi789jkl012mn    2025-12-30   14:00:00  15:30:00  90.0min   mixed              120000     25000      8000       $0.8200
```

**Exit Codes**:
- 0: 成功
- 1: ディレクトリ不在

---

### session

特定セッションの詳細を表示します。

```
ocusage session <id> [options]
```

**Arguments**:
| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| id | string | Yes | セッションID (ses_xxx) |

**Options**:
| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| --path | -p | path | auto | メッセージディレクトリ |

**Output** (stdout):
```
Session: ses_48be92eaeffepmcHE35j3U6N6f
Date: 2025-12-31
Time: 10:30:00 - 11:45:30 (75.5 min)
Model: claude-opus-4.5

Messages:
  #1  user       10:30:00  -
  #2  assistant  10:30:05  input: 1500, output: 500, cache: 200
  #3  user       10:35:00  -
  #4  assistant  10:35:10  input: 2000, output: 800, cache: 300
  ...

Summary:
  Input tokens:  50000
  Output tokens: 10000
  Cache tokens:  5000
  Total cost:    $0.3150
```

**Exit Codes**:
- 0: 成功
- 1: セッション不在

---

### models

モデル別の使用量集計を表示します。

```
ocusage models [options]
```

**Options**:
| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| --from | -f | date | - | 開始日 (YYYY-MM-DD) |
| --to | -t | date | - | 終了日 (YYYY-MM-DD) |
| --path | -p | path | auto | メッセージディレクトリ |

**Output** (stdout):
```
MODEL                INPUT         OUTPUT        CACHE         COST
claude-opus-4.5      1,500,000     300,000       50,000        $15.0000
claude-sonnet-4      500,000       100,000       20,000        $2.5000
gpt-4o               200,000       50,000        10,000        $1.2000
─────────────────────────────────────────────────────────────────────
TOTAL                2,200,000     450,000       80,000        $18.7000
```

**Exit Codes**:
- 0: 成功
- 1: ディレクトリ不在

---

### daily

日別の使用量集計を表示します。

```
ocusage daily [options]
```

**Options**:
| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| --from | -f | date | - | 開始日 (YYYY-MM-DD) |
| --to | -t | date | - | 終了日 (YYYY-MM-DD) |
| --model | -m | string | - | モデル名でフィルタ |
| --path | -p | path | auto | メッセージディレクトリ |

**Output** (stdout):
```
DATE         SESSIONS  INPUT         OUTPUT        CACHE         COST
2025-12-31   5         500,000       100,000       20,000        $5.0000
2025-12-30   3         300,000       60,000        15,000        $3.0000
2025-12-29   8         800,000       200,000       40,000        $8.5000
─────────────────────────────────────────────────────────────────────
TOTAL        16        1,600,000     360,000       75,000        $16.5000
```

**Exit Codes**:
- 0: 成功
- 1: ディレクトリ不在

---

### weekly

週別の使用量集計を表示します。

```
ocusage weekly [options]
```

**Options**: dailyと同じ

**Output** (stdout):
```
WEEK         SESSIONS  INPUT         OUTPUT        CACHE         COST
2025-W52     16        1,600,000     360,000       75,000        $16.5000
2025-W51     12        1,200,000     280,000       60,000        $12.0000
─────────────────────────────────────────────────────────────────────
TOTAL        28        2,800,000     640,000       135,000       $28.5000
```

---

### monthly

月別の使用量集計を表示します。

```
ocusage monthly [options]
```

**Options**: dailyと同じ

**Output** (stdout):
```
MONTH      SESSIONS  INPUT         OUTPUT        CACHE         COST
2025-12    50        5,000,000     1,000,000     200,000       $50.0000
2025-11    45        4,500,000     900,000       180,000       $45.0000
─────────────────────────────────────────────────────────────────────
TOTAL      95        9,500,000     1,900,000     380,000       $95.0000
```

---

### export

セッションデータをCSV/JSON形式でエクスポートします。

```
ocusage export [options]
```

**Options**:
| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| --format | - | string | csv | 出力形式 (csv/json) |
| --output | -o | path | stdout | 出力先ファイル |
| --from | -f | date | - | 開始日 (YYYY-MM-DD) |
| --to | -t | date | - | 終了日 (YYYY-MM-DD) |
| --model | -m | string | - | モデル名でフィルタ |
| --path | -p | path | auto | メッセージディレクトリ |

**Output (CSV)**:
```csv
session_id,date,start_time,end_time,duration_minutes,model,input_tokens,output_tokens,cache_tokens,total_cost
ses_48be92eaeffepmcHE35j3U6N6f,2025-12-31,10:30:00,11:45:30,75.5,claude-opus-4.5,50000,10000,5000,0.3150
```

**Output (JSON)**: See spec.md for full schema

**Exit Codes**:
- 0: 成功
- 1: ディレクトリ不在
- 2: 不正なフォーマット指定

---

### live

リアルタイムで使用量を監視します。

```
ocusage live [options]
```

**Options**:
| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| --path | -p | path | auto | メッセージディレクトリ |

**Output** (stdout, real-time):
```
Watching: ~/.local/share/opencode/storage/message
Press Ctrl+C to stop

[10:30:05] ses_xxx | claude-opus-4.5 | +1500 input, +500 output | $0.0150
[10:30:15] ses_xxx | claude-opus-4.5 | +2000 input, +800 output | $0.0250
...

Summary on exit:
  Total input:  50,000
  Total output: 10,000
  Total cost:   $0.3150
```

**Exit Codes**:
- 0: 正常終了 (Ctrl+C)
- 1: ディレクトリ不在

---

## Global Options

全コマンドで利用可能なオプション:

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| --help | -h | - | - | ヘルプ表示 |
| --version | -v | - | - | バージョン表示 |
| --config | -c | path | auto | 設定ファイルパス |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| OCUSAGE_MESSAGES_DIR | メッセージディレクトリ | ~/.local/share/opencode/storage/message |
| OCUSAGE_MODELS_FILE | models.jsonパス | ~/.config/ocusage/models.json |
| OCUSAGE_LOG_LEVEL | ログレベル (debug/info/warn/error) | warn |

## Exit Codes Summary

| Code | Meaning |
|------|---------|
| 0 | 成功 |
| 1 | 一般エラー（ディレクトリ不在、セッション不在など） |
| 2 | 引数/設定エラー（不正なフラグ、日付形式エラーなど） |
