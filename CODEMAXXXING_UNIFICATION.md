# Codemaxxxing Integration

Canonical branch: `wave-compatibility` in `C:\codefix\integration-main`.

## Sources

- `upstream/dev`: merged at `da50c6899` from `337fd144d2`.
- `origin/codemaxxxing`: refreshed at `3456507df`.
- Pre-sync recovery ref: `backup/integration-pre-sync-20260905`.

## Ported TUI

- Added Afterglow theme helpers and inline-safe text handling under `packages/tui/src/ui` and `packages/tui/src/util`.
- Restored codemaxxxing home branding, recent-session/status composition, footer/sidebar identity, and wordmark.
- Added text clipboard insertion with Windows-compatible line-ending normalization.
- Added Ctrl+V handling to dialog prompt/select bindings without intercepting image/native paste.
- Expanded the wave context and dashboard with availability handling, status metadata, row navigation, and responsive truncation.

## Upstream Behavior Confirmed

- Fable 5.1 thinking block binding is present in the current provider transform and patched AI SDK versions.
- Unknown-extension image signature sniffing is present through `sniffAttachmentMime()`.
- PTY WebSocket upgrade/tracking is present in the current HttpApi handler.

## Verification

- `packages/tui`: typecheck passed.
- `packages/core`: typecheck passed.
- `packages/opencode`: typecheck passed.
- TUI focused tests: 10 passing; dialog/session focused tests: 2 passing.
- Provider transform tests: 561 passing.
- PTY HttpApi tests: 5 passing, 8 skipped.
- Full TUI tests: 198 passing, 1 skipped, 1 Windows path-normalization failure in the pre-existing `runtime.test.tsx` suite.
- Windows build: `packages/opencode/dist/opencode-windows-x64/bin/opencode.exe` built successfully.
- Build smoke test: `0.0.0-wave-compatibility-202609060536`.
- Interactive launch: compiled binary rendered the codemaxxxing home UI and exited cleanly on Ctrl+C.

The old checkout directories are reference-only and are archived before removal; `integration-main` remains the sole canonical working copy.

## Built-In Skills

- Vendored `mattpocock/skills` at revision `3cca18b368ae95cdbdebbff572ccafa662551015`.
- Embedded 37 skills and 100 supporting files into the compiled application manifest.
- Materializes them lazily under the OpenCode cache and registers them in both current and legacy skill services.
- Verified from an external directory with `opencode.exe debug skill`; the catalog is available without repository-local skill files.
