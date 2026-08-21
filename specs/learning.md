# Local Error Learning

Local, private error detection and learning integrated from `code3hr/cyxcode` (MIT, see `THIRD_PARTY_NOTICES.md`). The shell tool detects recurring failure patterns, proposes or auto-runs trusted fixes, and retains project knowledge (memories, corrections, state history, knowledge indexes) under the project directory. Nothing leaves the machine.

## Feature switch

All learning behavior is controlled by the `learning` config block (`opencode.json` → `"learning"` or Settings → General). Defaults are on.

- `enabled: false` — master switch. Stops every automatic side effect: shell failure detection, capture correlation, prompt-context injection, session-end state commits, Dream consolidation, tool-error memories, and compaction indexing. `GET /learning/status` reports `"enabled": false`. Manual, explicitly requested operations (the `learning` tool, CLI subcommands, HTTP endpoints, Settings maintenance buttons) remain available so data can still be inspected or cleared.
- `automatic: false` — disables only automatic shell failure detection; passive knowledge retention continues.
- `autoFix: false` / `retryOriginal: false` — keep pattern matching but never execute a generated fix or retry.
- `recall: false` — lexical-only recall; no embedding model is loaded or downloaded.
- `communityPacks: false` — ignore installed community packs at match time.

The disabled path is covered by `packages/opencode/test/learning/disabled.test.ts`.

## Safety model

- Generated fixes run through the normal shell permission flow (`authorize()`); permissions are never bypassed. Suggestions that exist only as AI text are never executed.
- A trusted fix runs once; if it succeeds and `retryOriginal` is on, the original command is retried once. No recursion: recovery runs are marked and never trigger further learning.
- Regexes are validated for safety before storage or execution (`isSafeRegex`); capture substitution quotes values for the target shell.
- Sensitive paths (`.env`, keys, credentials) are never matched or captured. Output is secret-redacted and tail-truncated (2000 chars) before storage.
- All learning errors fail open with a log warning; shell/session execution is never blocked by learning failures.

## Data layout

- Project: `.opencode/learning/` — patterns, memories (sensitive entries AES-256-GCM encrypted), corrections, captures, audit JSONL, state commits + HEAD, wiki/codegraph/graph indexes, SQLite recall DB.
- Global: `Global.Path.data/learning/` — global patterns, cross-project promotion observations, global audit, encryption key.
- Model cache: `Global.Path.cache/learning/models/` (semantic recall model, downloaded only on explicit request).
- Legacy cyxcode data (`.cyxcode/patterns/learned.json`, `.opencode/cyxcode-learned.json`) is imported once per project without deleting sources.

## Surfaces

- Tool: `learning` with actions `status, remember, correct, recall, dream, history, report, export, clear, reindex, model-status, model-download, model-delete, pack-install, wiki-query, codegraph-query, graph-query`.
- CLI: `opencode learning <action>` (`--summary --content --rule --scope --query --limit --url`).
- Slash commands: `/learn`, `/learn-patterns`, `/remember`, `/correct`, `/recall`, `/dream`, `/history`, `/learning-status`, `/learning-report`, `/learning-export`.
- HTTP API: `GET /learning/status|history|report|export|model`, `POST /learning/remember|correct|recall|dream|reindex|clear|packs|knowledge|model`, `DELETE /learning/model`.
- Settings: General → Local error learning (toggles, scope/privacy, recall mode, maintenance actions with confirmations).
- Shell results carry inline `learning` metadata (matched pattern, fix, fix/retry exit codes) rendered in the TUI.

## Pattern tiers

Match precedence: project > global > community > bundled. Bundled packs ship in-process (bun, go, rust, ruby, security-devops). Remote packs install over HTTPS only (no URL credentials, redirects must stay HTTPS, ≤1 MB, ≤500 patterns, safe regexes enforced); remote pack fixes are always untrusted. Patterns verified across enough distinct projects (`globalPromotionThreshold`, default 3) promote to the global tier.

## Corrections and AGENTS.md promotion

`learning correct "Use bun instead of npm"` records a correction with strength reinforcement and decay. When a correction repeats past `promotionThreshold` (with `autoPromote`, default on), it is written to the project `AGENTS.md` under a deterministic `## Learned Corrections` section using idempotent `<!-- learning:<id> -->` markers; surrounding content is preserved.

## Semantic recall

Memories and code files are embedded into a local SQLite index for similarity recall. The `@xenova/transformers` model (`Xenova/all-MiniLM-L6-v2` by default) is lazy: nothing downloads until an explicit download action (tool/CLI/HTTP/Settings). Without the model, recall falls back to lexical scoring. Storage uses portable Bun/Node SQLite via the `#learning-sqlite` import map.

## Rollout notes

- Ship defaults-on; the master switch and `automatic: false` provide gradual opt-outs.
- Verify after deploy: `opencode learning status` reports `enabled: true`; failing a command twice produces a learned pattern visible in `opencode learning report`; Settings toggles persist to `opencode.json`.
- Knowledge indexes build during sessions (compaction summaries) and on demand (`reindex`); they feed bounded context injection (corrections → resume → patterns → memories → graph links, capped ~3000 chars).
