# Tasks: OpenCode Usage Tracker (ocusage)

**Input**: Design documents from `/specs/001-opencode-usage-tracker/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/cli.md

**Tests**: Unit tests are included for core business logic (parser, aggregator, cost calculation).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Initialize Bun project with package.json (name: ocusage, type: module)
- [ ] T002 [P] Create tsconfig.json with strict mode and @ path alias
- [ ] T003 [P] Create biome.json for linting/formatting configuration
- [ ] T004 Create directory structure: src/, src/commands/, src/models/, src/services/, src/lib/, tests/unit/, tests/integration/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

### Models (Type Definitions)

- [ ] T005 [P] Create Message types in src/models/message.ts (MessageTime, CacheTokens, TokenUsage, MessageRole, Message)
- [ ] T006 [P] Create Session types in src/models/session.ts (Session, getSessionDurationMinutes)
- [ ] T007 [P] Create UsageSummary types in src/models/usage.ts (UsageSummary, createEmptyUsageSummary, mergeUsageSummaries)
- [ ] T008 [P] Create ModelConfig types in src/models/model.ts (ModelConfig, ModelConfigMap, getCacheCostPerMillion)
- [ ] T009 [P] Create AppConfig types in src/models/config.ts (AppConfig, DEFAULT_CONFIG)
- [ ] T010 Create models barrel export in src/models/index.ts

### Core Services

- [ ] T011 Implement config service in src/services/config.ts (resolveMessagesDir, resolveModelsFile, loadAppConfig)
- [ ] T012 Implement message parser in src/services/parser.ts (isValidMessage, parseMessageFile, scanMessages)
- [ ] T013 Implement cost calculator in src/services/cost.ts (loadModelConfigs, calculateMessageCost, calculateUsageCost)
- [ ] T014 Implement aggregator in src/services/aggregator.ts (buildSession, aggregateSessions, aggregateByModel, aggregateByPeriod)

### Utility Libraries

- [ ] T015 [P] Implement date utilities in src/lib/date.ts (formatDate, formatTime, parseDate, getWeekNumber, getDayStart, getWeekStart, getMonthStart)
- [ ] T016 [P] Implement formatter utilities in src/lib/formatter.ts (formatTokens, formatCost, formatDuration, formatTable)
- [ ] T017 [P] Implement fs utilities in src/lib/fs.ts (expandPath, fileExists, dirExists)

### CLI Entry Point

- [ ] T018 Create CLI entry point with gunshi in src/index.ts (main command with subcommands)

### Unit Tests (Foundational)

- [ ] T019 [P] Unit tests for parser in tests/unit/parser.test.ts
- [ ] T020 [P] Unit tests for cost calculator in tests/unit/cost.test.ts
- [ ] T021 [P] Unit tests for aggregator in tests/unit/aggregator.test.ts
- [ ] T022 [P] Unit tests for date utilities in tests/unit/date.test.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Session List Display (Priority: P1) MVP

**Goal**: Display all sessions with ID, date, model, tokens, and cost

**Independent Test**: Run `ocusage sessions` and verify session list is displayed correctly

### Implementation for User Story 1

- [ ] T023 [US1] Implement sessions command in src/commands/sessions.ts
  - Options: --from, --to, --model, --path, --sort, --order
  - Output: tab-separated table with header
  - Exit codes: 0 (success), 1 (directory not found)
- [ ] T024 [US1] Add sessions subcommand to src/index.ts
- [ ] T025 [US1] Integration test for sessions command in tests/integration/sessions.test.ts

**Checkpoint**: User Story 1 complete - `ocusage sessions` works independently

---

## Phase 4: User Story 2 - CSV/JSON Export (Priority: P1) MVP

**Goal**: Export session data to CSV or JSON format

**Independent Test**: Run `ocusage export --format csv` and verify valid CSV output

### Implementation for User Story 2

- [ ] T026 [P] [US2] Implement CSV exporter in src/lib/exporter.ts (exportToCsv function)
- [ ] T027 [P] [US2] Implement JSON exporter in src/lib/exporter.ts (exportToJson function)
- [ ] T028 [US2] Implement export command in src/commands/export.ts
  - Options: --format (csv/json), --output, --from, --to, --model, --path
  - Output: CSV/JSON to stdout or file
  - Exit codes: 0 (success), 1 (directory not found), 2 (invalid format)
- [ ] T029 [US2] Add export subcommand to src/index.ts
- [ ] T030 [US2] Unit tests for exporter in tests/unit/exporter.test.ts
- [ ] T031 [US2] Integration test for export command in tests/integration/export.test.ts

**Checkpoint**: User Story 2 complete - `ocusage export` works independently

---

## Phase 5: User Story 3 - Model Aggregation (Priority: P2)

**Goal**: Display token usage and cost aggregated by model

**Independent Test**: Run `ocusage models` and verify model-wise aggregation is displayed

### Implementation for User Story 3

- [ ] T032 [US3] Implement models command in src/commands/models.ts
  - Options: --from, --to, --path
  - Output: table with MODEL, INPUT, OUTPUT, CACHE, COST columns + TOTAL row
  - Exit codes: 0 (success), 1 (directory not found)
- [ ] T033 [US3] Add models subcommand to src/index.ts
- [ ] T034 [US3] Integration test for models command in tests/integration/models.test.ts

**Checkpoint**: User Story 3 complete - `ocusage models` works independently

---

## Phase 6: User Story 4 - Period Aggregation (Priority: P2)

**Goal**: Display daily/weekly/monthly aggregated usage

**Independent Test**: Run `ocusage daily`, `ocusage weekly`, `ocusage monthly` and verify period aggregation

### Implementation for User Story 4

- [ ] T035 [P] [US4] Implement daily command in src/commands/daily.ts
  - Options: --from, --to, --model, --path
  - Output: table with DATE, SESSIONS, INPUT, OUTPUT, CACHE, COST columns + TOTAL row
- [ ] T036 [P] [US4] Implement weekly command in src/commands/weekly.ts
  - Options: same as daily
  - Output: table with WEEK (YYYY-Www), SESSIONS, INPUT, OUTPUT, CACHE, COST columns + TOTAL row
- [ ] T037 [P] [US4] Implement monthly command in src/commands/monthly.ts
  - Options: same as daily
  - Output: table with MONTH (YYYY-MM), SESSIONS, INPUT, OUTPUT, CACHE, COST columns + TOTAL row
- [ ] T038 [US4] Add daily/weekly/monthly subcommands to src/index.ts
- [ ] T039 [US4] Integration test for period commands in tests/integration/period.test.ts

**Checkpoint**: User Story 4 complete - `ocusage daily/weekly/monthly` work independently

---

## Phase 7: User Story 5 - Session Detail (Priority: P3)

**Goal**: Display detailed information for a specific session

**Independent Test**: Run `ocusage session <id>` and verify session details are displayed

### Implementation for User Story 5

- [ ] T040 [US5] Implement session command in src/commands/session.ts
  - Arguments: id (required, positional)
  - Options: --path
  - Output: structured session detail with message list
  - Exit codes: 0 (success), 1 (session not found)
- [ ] T041 [US5] Add session subcommand to src/index.ts
- [ ] T042 [US5] Integration test for session command in tests/integration/session.test.ts

**Checkpoint**: User Story 5 complete - `ocusage session <id>` works independently

---

## Phase 8: User Story 6 - Live Monitoring (Priority: P3)

**Goal**: Real-time monitoring of ongoing session usage

**Independent Test**: Run `ocusage live`, create new messages, verify display updates

### Implementation for User Story 6

- [ ] T043 [US6] Implement file watcher utility in src/lib/watcher.ts (using Bun.spawn or fs.watch)
- [ ] T044 [US6] Implement live command in src/commands/live.ts
  - Options: --path
  - Output: real-time updates on new messages, summary on Ctrl+C
  - Exit codes: 0 (normal exit), 1 (directory not found)
- [ ] T045 [US6] Add live subcommand to src/index.ts
- [ ] T046 [US6] Integration test for live command in tests/integration/live.test.ts

**Checkpoint**: User Story 6 complete - `ocusage live` works independently

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T047 [P] Create default models.json with common model prices in assets/models.json
- [ ] T048 [P] Add --help and --version global flags implementation
- [ ] T049 [P] Add consola logging throughout services (respecting OCUSAGE_LOG_LEVEL)
- [ ] T050 Validate quickstart.md by running through setup steps
- [ ] T051 Code cleanup: ensure all files use @ path alias consistently
- [ ] T052 Run biome lint and fix any issues
- [ ] T053 Run biome format on all source files
- [ ] T054 Run all tests and ensure they pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - User stories can then proceed in priority order (P1 -> P2 -> P3)
  - Or in parallel if multiple developers
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

| Story | Priority | Can Start After | Dependencies |
|-------|----------|-----------------|--------------|
| US1 (sessions) | P1 | Phase 2 | None |
| US2 (export) | P1 | Phase 2 | None (can parallel with US1) |
| US3 (models) | P2 | Phase 2 | None |
| US4 (daily/weekly/monthly) | P2 | Phase 2 | None |
| US5 (session detail) | P3 | Phase 2 | None |
| US6 (live) | P3 | Phase 2 | None |

### Parallel Opportunities

**Phase 1 (Setup)**:
- T002, T003 can run in parallel

**Phase 2 (Foundational)**:
- T005, T006, T007, T008, T009 (models) - all parallel
- T015, T016, T017 (lib utilities) - all parallel
- T019, T020, T021, T022 (unit tests) - all parallel after services complete

**Phase 4 (US2)**:
- T026, T027 (exporter functions) - parallel

**Phase 6 (US4)**:
- T035, T036, T037 (period commands) - all parallel

**Phase 9 (Polish)**:
- T047, T048, T049 - all parallel

---

## Implementation Strategy

### MVP First (P1 Stories Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T022)
3. Complete Phase 3: User Story 1 - sessions (T023-T025)
4. Complete Phase 4: User Story 2 - export (T026-T031)
5. **STOP and VALIDATE**: Both P1 stories functional
6. Deploy/demo if ready

### Full Implementation

Continue with:
- Phase 5: User Story 3 - models (P2)
- Phase 6: User Story 4 - daily/weekly/monthly (P2)
- Phase 7: User Story 5 - session detail (P3)
- Phase 8: User Story 6 - live (P3)
- Phase 9: Polish

---

## Task Summary

| Phase | Description | Task Count |
|-------|-------------|------------|
| Phase 1 | Setup | 4 |
| Phase 2 | Foundational | 18 |
| Phase 3 | US1 - Sessions (P1) | 3 |
| Phase 4 | US2 - Export (P1) | 6 |
| Phase 5 | US3 - Models (P2) | 3 |
| Phase 6 | US4 - Period (P2) | 5 |
| Phase 7 | US5 - Session Detail (P3) | 3 |
| Phase 8 | US6 - Live (P3) | 4 |
| Phase 9 | Polish | 8 |
| **TOTAL** | | **54** |

### Tasks by User Story

| User Story | Tasks | IDs |
|------------|-------|-----|
| US1 (sessions) | 3 | T023-T025 |
| US2 (export) | 6 | T026-T031 |
| US3 (models) | 3 | T032-T034 |
| US4 (period) | 5 | T035-T039 |
| US5 (session) | 3 | T040-T042 |
| US6 (live) | 4 | T043-T046 |

### MVP Scope (P1 Stories)

- **Total MVP Tasks**: 31 tasks (Phase 1 + 2 + 3 + 4)
- **MVP Features**: `sessions`, `export`
- **Post-MVP Tasks**: 23 tasks (Phase 5 + 6 + 7 + 8 + 9)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Biome replaces ESLint/Prettier - use `bun x @biomejs/biome` commands
