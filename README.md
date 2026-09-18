<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="OpenCode logo">
    </picture>
  </a>
</p>
<p align="center"><strong>Debugmaxxxing</strong></p>
<p align="center">An experimental internal fork of OpenCode with custom TUI and workflow integrations.</p>
<p align="center">
  <a href="https://github.com/NormalDudeBro/debugmaxxxing/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/NormalDudeBro/debugmaxxxing?style=flat-square" /></a>
</p>

<p align="center">
  <a href="README.md">English</a> |
  <a href="README.zh.md">简体中文</a> |
  <a href="README.zht.md">繁體中文</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.de.md">Deutsch</a> |
  <a href="README.es.md">Español</a> |
  <a href="README.fr.md">Français</a> |
  <a href="README.it.md">Italiano</a> |
  <a href="README.da.md">Dansk</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.pl.md">Polski</a> |
  <a href="README.ru.md">Русский</a> |
  <a href="README.bs.md">Bosanski</a> |
  <a href="README.ar.md">العربية</a> |
  <a href="README.no.md">Norsk</a> |
  <a href="README.br.md">Português (Brasil)</a> |
  <a href="README.th.md">ไทย</a> |
  <a href="README.tr.md">Türkçe</a> |
  <a href="README.uk.md">Українська</a> |
  <a href="README.bn.md">বাংলা</a> |
  <a href="README.gr.md">Ελληνικά</a> |
  <a href="README.vi.md">Tiếng Việt</a>
</p>

[![OpenCode Terminal UI](packages/web/src/assets/lander/screenshot.png)](https://opencode.ai)

---

## Repository Scope

Debugmaxxxing is an internal, experimental fork of
[anomalyco/opencode](https://github.com/anomalyco/opencode). It is not an
official OpenCode distribution and is not affiliated with the upstream team.

The canonical source branch is `main`. This fork adds and maintains:

- A custom wave TUI, dashboard, branding, and status views.
- Windows-friendly clipboard behavior and a Windows x64 CLI build.
- Integrated development skills vendored from Matt Pocock's skills repository.
- Debugmaxxxing-specific workflow, state, and provider integrations.

Use the [Debugmaxxxing release](#debugmaxxxing-release) below for this fork.

### Upstream OpenCode Installation (Not This Fork)

The commands in this section install official upstream OpenCode packages. They
are included for upstream reference; they do not install Debugmaxxxing.

```bash
# YOLO
curl -fsSL https://opencode.ai/install | bash

# Package managers
npm i -g opencode-ai@latest        # or bun/pnpm/yarn
scoop install opencode             # Windows
choco install opencode             # Windows
brew install anomalyco/tap/opencode # macOS and Linux (recommended, always up to date)
brew install opencode              # macOS and Linux (official brew formula, updated less)
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-bin               # Arch Linux (Latest from AUR)
mise use -g opencode               # Any OS
nix run nixpkgs#opencode           # or github:anomalyco/opencode for latest dev branch
```

> [!TIP]
> Remove versions older than 0.1.x before installing.

## Debugmaxxxing Release

The current `wave-compatibility` release is `v1.18.29` and includes a Windows
x64 CLI build that reports a semver-compatible version for free-tier models.

#### Windows x64: Quick Install

1. Open the [v1.18.29 release](https://github.com/NormalDudeBro/debugmaxxxing/releases/tag/v1.18.29).
2. Download `opencode-windows-x64.zip`.
3. Extract the ZIP to a folder such as `C:\Tools\opencode`.
4. Open PowerShell in that folder.
5. Verify the install:

   ```powershell
   .\opencode.exe --version
   ```

   The output should be `1.18.29`.

6. Start OpenCode from that folder:

   ```powershell
   .\opencode.exe
   ```

To run `opencode` from any PowerShell window, add the extracted folder to your
user `Path` environment variable and open a new terminal.

#### Build From Source

1. Install Git and [Bun 1.3.14](https://bun.sh/).
2. Clone the release branch:

   ```powershell
   git clone --branch wave-compatibility --single-branch https://github.com/NormalDudeBro/debugmaxxxing.git
   cd debugmaxxxing
   ```

3. Install dependencies and build the Windows x64 binary:

   ```powershell
   bun install
   $env:OPENCODE_VERSION = "1.18.29"
   bun run packages/opencode/script/build.ts --single
   ```

4. Run the result:

   ```powershell
   .\packages\opencode\dist\opencode-windows-x64\bin\opencode.exe
   ```

### Upstream Desktop App (BETA)

OpenCode is also available as a desktop application. Download directly from the [releases page](https://github.com/anomalyco/opencode/releases) or [opencode.ai/download](https://opencode.ai/download).

| Platform              | Download                           |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-windows-x64.exe` |
| Linux                 | `.deb`, `.rpm`, or `.AppImage`     |

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
# Windows (Scoop)
scoop bucket add extras; scoop install extras/opencode-desktop
```

#### Installation Directory

The install script respects the following priority order for the installation path:

1. `$OPENCODE_INSTALL_DIR` - Custom installation directory
2. `$XDG_BIN_DIR` - XDG Base Directory Specification compliant path
3. `$HOME/bin` - Standard user binary directory (if it exists or can be created)
4. `$HOME/.opencode/bin` - Default fallback

```bash
# Examples
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/install | bash
```

### Agents

OpenCode includes two built-in agents you can switch between with the `Tab` key.

- **build** - Default, full-access agent for development work
- **plan** - Read-only agent for analysis and code exploration
  - Denies file edits by default
  - Asks permission before running bash commands
  - Ideal for exploring unfamiliar codebases or planning changes

Also included is a **general** subagent for complex searches and multistep tasks.
This is used internally and can be invoked using `@general` in messages.

Learn more about [agents](https://opencode.ai/docs/agents).

### Documentation

For more info on how to configure OpenCode, [**head over to our docs**](https://opencode.ai/docs).

### Contributing

If you're interested in contributing to OpenCode, please read our [contributing docs](./CONTRIBUTING.md) before submitting a pull request.

### Upstream Attribution

This repository is derived from the upstream OpenCode project. See the
[upstream repository](https://github.com/anomalyco/opencode) for the official
project, releases, documentation, and community resources.

---

**Join our community** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
