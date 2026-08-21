# Debugmaxxxing

Debugmaxxxing is an upstream-first terminal AI coding environment for people who want a fast, inspectable, customizable development assistant. It keeps current OpenCode architecture as its safety net, adds a focused Codemaxxxing-inspired terminal experience, and carries targeted fixes for real-world edge cases.

Debugmaxxxing is built from and remains compatible with [OpenCode](https://github.com/anomalyco/opencode). It is not an official OpenCode release. Its UI/UX direction is informed by [Codemaxxxing](https://github.com/bb-deeplearning/codemaxxxing), while the `main` branch intentionally favors current upstream behavior when the projects diverge.

## Product Overview

### Terminal-first workflow

- Work with an interactive TUI designed for keyboard-driven development.
- Switch between build and plan-oriented agents.
- Continue sessions, inspect history, review changes, and work across projects.
- Run commands through the integrated shell/process tools with persistent process support where available.

### Coding tools

- Read, write, edit, and apply patches to project files.
- Search with glob and grep tools.
- Use LSP features for language-aware development.
- Delegate focused research or implementation tasks to subagents.
- Connect MCP servers and use provider/plugin integrations.
- Fetch web documentation when the configured provider and permissions allow it.

### Permissions and safety

- Configure tool and agent permissions in project or user configuration.
- Keep read, edit, shell, task, provider, and integration capabilities independently controllable.
- Preserve explicit denies and agent-specific restrictions when spawning subagents.
- The legacy `external_directory` file-touch verification has been removed from the current permission flow. File tools and shell commands use their current tool permissions instead of emitting a second external-directory prompt.
- Upstream OpenCode remains the architectural safety net for the distribution.

### Wave campaigns

The wave workflow turns a multi-step plan into a visible campaign:

- Campaign state lives in `.wave/campaigns/<campaign-id>/STATE.md`.
- `.wave/active` selects the campaign shown by the TUI.
- The TUI exposes a wave dashboard and a home-screen campaign indicator.
- The dashboard shows campaign status, current wave, session identity, progress rows, and notes.
- `arm`/`next` creates a session for the current wave, submits its `WAVE.md` instructions, and persists running/completed state.
- Pause, resume, interrupt, and stop actions are available through the wave API and TUI controls.

Verifier escalation, crash recovery, and fully persisted retry caps are still being hardened. Treat the wave executor as an active compatibility feature rather than a mature release-management system.

## Install From Source

Debugmaxxxing does not currently publish a separate package or installer. Build it from source with [Bun](https://bun.sh/).

### Prerequisites

- Git
- Bun `1.3.14` or a compatible Bun release
- A supported terminal
- Windows native builds: Visual Studio C++ build tools may be required for native dependencies
- macOS/Linux builds: the platform toolchain required by Bun/native dependencies

```bash
cd debugmaxxxing
bun install
```

On Windows, if a native dependency install fails, install the Visual Studio C++ workload and rerun `bun install`.

## Run From Source

Start the OpenCode-compatible development entry point:

```bash
bun run --cwd packages/opencode dev
```

The root shortcut is also available:

```bash
bun run dev
```

The application starts in the terminal. Use the command palette to inspect available commands; use `/wave` to open the wave dashboard when a `.wave` campaign is active.

## Build A Binary

Build a native binary for the current platform and run its version smoke test:

```bash
bun run --cwd packages/opencode build --single --skip-install
```

The build embeds the Web UI and writes the result below:

```text
packages/opencode/dist/opencode-windows-x64/bin/opencode.exe
packages/opencode/dist/opencode-darwin-arm64/bin/opencode
packages/opencode/dist/opencode-linux-x64/bin/opencode
```

The exact directory depends on the host platform and architecture. Use `--baseline` when a baseline x64 build is required. Release packaging is intentionally separate from this development build.

## Configuration

Configuration follows the OpenCode configuration model. Start with a project `opencode.json` or `opencode.jsonc` and configure:

- `model` and provider credentials
- agent definitions and prompts
- tool and permission rules
- MCP servers
- LSP servers
- formatters
- TUI preferences and keybindings

Use the current upstream documentation for generic configuration concepts, then verify Debugmaxxxing-specific behavior against this repository before relying on a feature:

- [OpenCode configuration](https://opencode.ai/docs/config/)
- [OpenCode agents](https://opencode.ai/docs/agents/)
- [OpenCode permissions](https://opencode.ai/docs/permissions/)

## Wave Campaign Files

A minimal campaign layout is:

```text
.wave/
  active
  campaigns/
    campaign-id/
      STATE.md
      plan/
        waves/
          wave_0/
            WAVE.md
            NOTES.md
```

`STATE.md` is the source of truth for campaign progress. The TUI reads it through the typed wave API, and executor actions persist transitions back to the file. Keep campaign writes serialized and avoid editing `STATE.md` concurrently from multiple processes.

## Development

Run checks from the package directories. The repository deliberately rejects tests launched from the root.

```bash
# Typecheck the OpenCode package
cd packages/opencode
bun typecheck

# Run the wave parser tests
bun test ./test/wave/state.test.ts

# Return to the repository root for SDK/OpenAPI generation
cd ../..
bun ./packages/sdk/js/script/build.ts
```

Useful development commands from the root:

```bash
bun run lint
bun run typecheck
bun run dev:web
bun run dev:desktop
bun run dev:storybook
```

When changing the public HttpApi, regenerate the SDK and inspect the generated diff before committing. Keep generated SDK/OpenAPI changes in the same logical change as their source API changes.

## Contributing

Keep changes focused and tested. For feature work:

1. Start from `main`.
2. Read the nearest `AGENTS.md` guidance before editing a package.
3. Add or update tests with the behavior change.
4. Run package typecheck and focused tests.
5. Regenerate SDK/OpenAPI artifacts when API schemas change.
6. Describe upstream compatibility and any intentional Debugmaxxxing divergence in the pull request.

The current default branch is `main`. Canonical upstream updates are fetched from `anomalyco/opencode:dev`.

## Project Links

- [Debugmaxxxing repository](https://github.com/NormalDudeBro/debugmaxxxing)
- [Debugmaxxxing main branch](https://github.com/NormalDudeBro/debugmaxxxing/tree/main)
- [Codemaxxxing](https://github.com/bb-deeplearning/codemaxxxing)
- [OpenCode upstream](https://github.com/anomalyco/opencode)
- [OpenCode documentation](https://opencode.ai/docs/)
- [Contributing guide](./CONTRIBUTING.md)

## Attribution And License

Debugmaxxxing builds on the open-source OpenCode project and preserves its license and attribution. Codemaxxxing UI/UX ideas and compatible improvements are credited to the Codemaxxxing project. See [LICENSE](./LICENSE) and the upstream project notices for complete licensing information.
