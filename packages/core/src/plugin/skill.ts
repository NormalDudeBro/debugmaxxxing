/// <reference path="../markdown.d.ts" />

export * as SkillPlugin from "./skill"

import { define } from "./internal"
import path from "path"
import { Effect } from "effect"
import { AbsolutePath } from "../schema"
import { SkillV2 } from "../skill"
import { FSUtil } from "../fs-util"
import { Global } from "../global"
import customizeOpencodeContent from "./skill/customize-opencode.md" with { type: "text" }
import { files, revision } from "./mattpocock.generated"

export const CustomizeOpencodeContent = customizeOpencodeContent

export const materializeMattPocockSkills = Effect.fn("SkillPlugin.materializeMattPocockSkills")(function* (
  fs: FSUtil.Interface,
  global: Global.Interface,
) {
  const root = path.join(global.cache, "built-in-skills", "mattpocock", revision)
  const marker = path.join(root, ".complete")
  if ((yield* fs.readFileStringSafe(marker))?.trim() === revision) return root
  for (const [file, content] of Object.entries(files)) yield* fs.writeWithDirs(path.join(root, file), content)
  yield* fs.writeWithDirs(marker, revision)
  return root
})

export const Plugin = define<FSUtil.Service | Global.Service>({
  id: "skill",
  effect: Effect.fn(function* (ctx) {
    const fs = yield* FSUtil.Service
    const global = yield* Global.Service
    const root = yield* materializeMattPocockSkills(fs, global).pipe(Effect.orDie)
    yield* ctx.skill.transform((draft) => {
      draft.source(
        SkillV2.EmbeddedSource.make({
          type: "embedded",
          skill: SkillV2.Info.make({
            name: "customize-opencode",
            description:
              "Use ONLY when the user is editing or creating opencode's own configuration: opencode.json, opencode.jsonc, files under .opencode/, or files under ~/.config/opencode/. Also use when creating or fixing opencode agents, subagents, commands, skills, plugins, MCP servers, or permission rules. Do not use for the user's own application code, or for any project that is not configuring opencode itself.",
            location: AbsolutePath.make("/builtin/customize-opencode.md"),
            content: CustomizeOpencodeContent,
          }),
        }),
      )
      draft.source(SkillV2.DirectorySource.make({ type: "directory", path: AbsolutePath.make(root) }))
    })
  }),
})
