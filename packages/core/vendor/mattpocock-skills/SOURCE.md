# Matt Pocock Skills Vendor

- Source: https://github.com/mattpocock/skills
- Revision: 3cca18b368ae95cdbdebbff572ccafa662551015
- Installed with: `npx skills@latest add mattpocock/skills --skill "*" --agent opencode --copy --yes`
- Scope: all skills discovered by the installer, including general/in-progress skills.
- Runtime policy: all skills are eligible for model invocation; harness-only `disable-model-invocation` frontmatter is intentionally ignored.
- Update: refresh the source revision with `bun run skills:update` from `packages/core`, then regenerate the embedded manifest.
- License: MIT, Copyright (c) 2026 Matt Pocock. See `LICENSE`.