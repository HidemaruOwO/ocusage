# ocusage

OpenCode usage tracker - Track and analyze token usage from OpenCode sessions.

![intro](/docs/intro.png)

## Features

- Session list with filtering and sorting
- Usage aggregation by model
- Daily / Weekly / Monthly token usage reports
- Cost calculation (supports free models, subscription usage, GPT, Claude, and more) (not fully covered)
- Export to CSV / JSON formats

## Installation

> [!NOTE]
> This package is currently under development and will be published to npm when it is ready.

```bash
git clone https://github.com/HidemaruOwO/ocusage.git
cd ocusage

bun install
bun link
```

## Usage

```bash
# Show daily usage
ocusage daily

# Show weekly usage
ocusage weekly

# Show monthly usage
ocusage monthly

# Show usage by model
ocusage models

# List all sessions
ocusage sessions
```

### Common Options

| Option          | Description                    |
| --------------- | ------------------------------ |
| `--json`        | Output as JSON                 |
| `--csv`         | Output as CSV                  |
| `--from`, `-f`  | Start date filter (YYYY-MM-DD) |
| `--to`, `-t`    | End date filter (YYYY-MM-DD)   |
| `--model`, `-m` | Filter by model name           |
| `--path`, `-p`  | Custom messages directory      |

### Examples

```bash
# Show sessions from the last week
ocusage sessions --from 2025-01-01 --to 2025-01-07

# Export daily usage as CSV
ocusage daily --csv > daily-usage.csv

# Show usage for a specific model
ocusage sessions --model claude-sonnet-4

# Output as JSON for scripting
ocusage models --json | jq '.totals.costUSD'
```

## Configuration

### Environment Variables

| Variable               | Description                        | Default                                   |
| ---------------------- | ---------------------------------- | ----------------------------------------- |
| `OCUSAGE_MESSAGES_DIR` | OpenCode messages directory        | `~/.local/share/opencode/storage/message` |
| `OCUSAGE_MODELS_FILE`  | Custom model pricing configuration | (uses built-in defaults)                  |
| `OCUSAGE_LOG_LEVEL`    | Log level (debug/info/warn/error)  | `warn`                                    |

### Supported Models

ocusage includes built-in pricing for major AI models:

- **Anthropic**: Claude Opus 4.5, Sonnet 4.5, Haiku 4.5, and more
- **OpenAI**: GPT-5.x, GPT-4.x, o1, o3, o4-mini, and more
- **Google**: Gemini 3, 2.5, 2.0 series
- **xAI**: Grok 4.x, 3.x series
- **OpenRouter**: anything

## Development

```bash
# Run in development
bun run dev

# Run tests
bun test

# Lint
bun run lint

# Format
bun run format

# Build
bun run build
```

## License

<div align="left" style="flex: inline" >
<a href="https://www.apache.org/licenses/LICENSE-2.0" >
<img src="https://img.shields.io/badge/License-Apache%20License%202.0-blue.svg" alt="Apache License 2.0"
</a>
<a href="https://github.com/MakeNowJust/sushi-ware" >
<img src="https://img.shields.io/badge/License-SUSHI--WARE%20%F0%9F%8D%A3-blue.svg" alt="SUSHI-WARE LICENSE"
</a>
</div>

This project is dual-licensed under [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0) and [SUSHI-WARE LICENSE](https://github.com/MakeNowJust/sushi-ware).

A reference to the latest license should be used, even if the attached license is outdated of major versions.

## Reference

This repository was created using the [MicroRepository](https://github.com/HidemaruOwO/MicroRepository) template.

- [HidemaruOwO/MicroRepository](https://github.com/HidemaruOwO/MicroRepository)

---

<div align="center">

**Made with ❤️ by [HidemaruOwO](https://github.com/HidemaruOwO)**

If ocusage helps improve your QOL of vibe coding, please ⭐ this repository!

</div>
