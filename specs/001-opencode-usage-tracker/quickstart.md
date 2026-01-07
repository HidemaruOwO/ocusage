# Quickstart: ocusage

OpenCodeのトークン使用量を追跡・分析するCLIツールのセットアップガイド。

## Prerequisites

- **Bun** v1.0以上
- **OpenCode** がインストール済みで、セッション履歴が存在すること

## Installation

```bash
# リポジトリをクローン
git clone https://github.com/yourname/ocusage.git
cd ocusage

# 依存関係をインストール
bun install

# グローバルにリンク（オプション）
bun link
```

## Quick Test

```bash
# セッション一覧を表示
bun run src/index.ts sessions

# または、リンク済みの場合
ocusage sessions
```

## Configuration

### models.json (モデル単価設定)

コスト計算を有効にするには、モデル単価ファイルを作成します：

```bash
mkdir -p ~/.config/ocusage
```

`~/.config/ocusage/models.json`:

```json
{
  "claude-sonnet-4-20250514": {
    "input_cost_per_million": 3.0,
    "output_cost_per_million": 15.0,
    "cache_cost_per_million": 0.3,
    "context_window": 200000,
    "description": "Claude Sonnet 4"
  },
  "claude-opus-4-20250514": {
    "input_cost_per_million": 15.0,
    "output_cost_per_million": 75.0,
    "cache_cost_per_million": 1.5,
    "context_window": 200000,
    "description": "Claude Opus 4"
  },
  "gpt-4o": {
    "input_cost_per_million": 2.5,
    "output_cost_per_million": 10.0,
    "context_window": 128000,
    "description": "GPT-4o"
  }
}
```

## Basic Usage

### セッション一覧

```bash
# 全セッション
ocusage sessions

# 今月のセッション
ocusage sessions --from 2025-01-01

# 特定モデルのみ
ocusage sessions --model claude-opus-4
```

### 期間別集計

```bash
# 日別
ocusage daily

# 週別
ocusage weekly

# 月別
ocusage monthly
```

### モデル別集計

```bash
ocusage models
```

### データエクスポート

```bash
# CSV出力
ocusage export --format csv --output usage.csv

# JSON出力
ocusage export --format json --output usage.json
```

### リアルタイム監視

```bash
ocusage live
# Ctrl+C で終了
```

## Environment Variables

| 変数                   | 説明                   | デフォルト                                |
| ---------------------- | ---------------------- | ----------------------------------------- |
| `OCUSAGE_MESSAGES_DIR` | メッセージディレクトリ | `~/.local/share/opencode/storage/message` |
| `OCUSAGE_MODELS_FILE`  | models.jsonパス        | `~/.config/ocusage/models.json`           |
| `OCUSAGE_LOG_LEVEL`    | ログレベル             | `warn`                                    |

## Development

```bash
# テスト実行
bun test

# リント
bun run lint

# フォーマット
bun run format

# ビルド
bun run build
```

## Troubleshooting

### "Messages directory not found"

OpenCodeのメッセージディレクトリが見つかりません：

```bash
# ディレクトリを確認
ls ~/.local/share/opencode/storage/message

# カスタムパスを指定
ocusage sessions --path /path/to/messages
```

### コストが全て0になる

models.jsonが見つからないか、モデル名が一致していません：

```bash
# models.jsonの存在確認
cat ~/.config/ocusage/models.json

# デバッグログを有効化
OCUSAGE_LOG_LEVEL=debug ocusage sessions
```

### 未知のモデル警告

モデル名がmodels.jsonに登録されていません。警告に表示されるモデル名をmodels.jsonに追加してください。
