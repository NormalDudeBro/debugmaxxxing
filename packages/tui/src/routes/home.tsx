import { Prompt, type PromptRef } from "../component/prompt"
import { createEffect, createMemo, createSignal, For, onMount, Show } from "solid-js"
import { Logo } from "../component/logo"
import { useSync } from "../context/sync"
import { Toast } from "../ui/toast"
import { useArgs } from "../context/args"
import { useRouteData } from "../context/route"
import { usePromptRef } from "../context/prompt"
import { useLocal } from "../context/local"
import { usePluginRuntime } from "../plugin/runtime"
import { useEditorContext } from "../context/editor"
import { useTerminalDimensions } from "@opentui/solid"
import { useTuiConfig } from "../config"
import { HomeSessionDestinationProvider } from "./home/session-destination"
import { useWave } from "../context/wave"
import { useTheme } from "../context/theme"
import { isDefaultTitle } from "../util/session"

let once = false
const placeholder = {
  normal: ["what's the move", "fire away", "go on, i'm listening", "what should we cook today", "fix broken tests"],
  shell: ["ls -la", "git status", "bun test", "pwd"],
}

function age(updated: number) {
  const minutes = Math.floor(Math.max(0, Date.now() - updated) / 60000)
  if (minutes < 1) return "now"
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

export function Home() {
  const pluginRuntime = usePluginRuntime()
  const sync = useSync()
  const route = useRouteData("home")
  const promptRef = usePromptRef()
  const [ref, setRef] = createSignal<PromptRef | undefined>()
  const args = useArgs()
  const local = useLocal()
  const editor = useEditorContext()
  const dimensions = useTerminalDimensions()
  const tuiConfig = useTuiConfig()
  const wave = useWave()
  const { theme } = useTheme()
  const status = createMemo(() => {
    const weekday = new Date().toLocaleDateString(undefined, { weekday: "long" }).toLowerCase()
    const model = local.model.parsed().model
    return model ? `${weekday}. ${model.toLowerCase()} is up.` : `${weekday}.`
  })
  const recent = createMemo(() => sync.data.session.filter((s) => !s.parentID).toSorted((a, b) => b.time.updated - a.time.updated).slice(0, 3))
  const promptMaxWidth = createMemo(() => {
    const configured = tuiConfig.prompt?.max_width
    if (configured === "auto") return Math.max(75, Math.floor(dimensions().width * 0.7))
    return configured ?? 75
  })
  let sent = false

  onMount(() => {
    editor.clearSelection()
  })

  const bind = (r: PromptRef | undefined) => {
    setRef(r)
    promptRef.set(r)
    if (once || !r) return
    if (route.prompt) {
      r.set(route.prompt)
      once = true
      return
    }
    if (!args.prompt) return
    r.set({ input: args.prompt, parts: [] })
    once = true
  }

  // Wait for sync and model store to be ready before auto-submitting --prompt
  createEffect(() => {
    const r = ref()
    if (sent) return
    if (!r) return
    if (!sync.ready || !local.model.ready) return
    if (!args.prompt) return
    if (r.current.input !== args.prompt) return
    sent = true
    r.submit()
  })

  return (
    <HomeSessionDestinationProvider>
      <box flexGrow={1} alignItems="center" paddingLeft={2} paddingRight={2}>
        <box flexGrow={1} minHeight={0} />
        <box height={2} minHeight={0} flexShrink={1} />
        <box width="100%" maxWidth={75} flexShrink={0}>
          <pluginRuntime.Slot name="home_logo" mode="replace">
            <Logo />
          </pluginRuntime.Slot>
          <box height={1} />
          <text fg={theme.textMuted}>{status()}</text>
          <Show when={recent().length > 0}>
            <box paddingTop={2} gap={1}>
              <For each={recent()}>
                {(session) => (
                  <box flexDirection="row" justifyContent="space-between" gap={2}>
                    <text fg={theme.text} wrapMode="none" flexShrink={1}>
                      <b>{isDefaultTitle(session.title) ? "new session" : session.title.toLowerCase()}</b>
                    </text>
                    <text fg={theme.textMuted} wrapMode="none" flexShrink={0}>
                      {age(session.time.updated)}
                    </text>
                  </box>
                )}
              </For>
            </box>
          </Show>
          <box width="100%" maxWidth={promptMaxWidth()} zIndex={1000} paddingTop={2} flexShrink={0}>
            <pluginRuntime.Slot name="home_prompt" mode="replace" ref={bind}>
              <Prompt ref={bind} right={<pluginRuntime.Slot name="home_prompt_right" />} placeholders={placeholder} />
            </pluginRuntime.Slot>
          </box>
          <pluginRuntime.Slot name="home_bottom" />
          <box flexGrow={1} minHeight={0} />
          <Toast />
        </box>
      </box>
      <box width="100%" flexShrink={0}>
        <Show when={wave.data.state}>
          {(state) => (
            <text fg={theme.textMuted}>
              wave · {state().campaign_id} · {state().wave_status}
            </text>
          )}
        </Show>
        <pluginRuntime.Slot name="home_footer" mode="single_winner" />
      </box>
    </HomeSessionDestinationProvider>
  )
}
