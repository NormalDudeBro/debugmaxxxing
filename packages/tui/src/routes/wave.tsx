import { For, Show, createMemo, createSignal, onCleanup, onMount } from "solid-js"
import { TextAttributes } from "@opentui/core"
import { useKeyboard, useTerminalDimensions } from "@opentui/solid"
import { useTheme } from "../context/theme"
import { useWave } from "../context/wave"
import { useRoute } from "../context/route"

const truncate = (value: string, width: number) => value.length > width ? `${value.slice(0, Math.max(1, width - 1))}…` : value

export function Wave() {
  const wave = useWave()
  const route = useRoute()
  const { theme } = useTheme()
  const dimensions = useTerminalDimensions()
  const [cursor, setCursor] = createSignal(0)
  const rows = createMemo(() => wave.data.state?.waves ?? [])
  const state = createMemo(() => wave.data.state)

  onMount(() => void wave.refresh())
  onCleanup(() => {})

  const move = (delta: number) => {
    if (!rows().length) return
    setCursor((value) => Math.max(0, Math.min(rows().length - 1, value + delta)))
  }

  useKeyboard((event) => {
    if (event.name === "escape") return route.navigate({ type: "home" })
    if (event.name === "up" || event.name === "k") return move(-1)
    if (event.name === "down" || event.name === "j") return move(1)
    if (event.name === "r") return void (state()?.loop_state === "paused" ? wave.resume() : wave.arm())
    if (event.name === "n") return void wave.next()
    if (event.name === "space") return void wave.pause()
    if (event.name === "i") return void wave.interrupt()
    if (event.name === "s") return void wave.stop()
    if (event.name === "f5") return void wave.refresh()
  })

  return (
    <box flexGrow={1} flexDirection="column" padding={2} gap={1}>
      <text fg={theme.primary} attributes={TextAttributes.BOLD}>Wave Dashboard</text>
      <Show when={wave.available}>
        <Show when={!wave.data.loading} fallback={<text fg={theme.textMuted}>Loading campaigns...</text>}>
          <Show when={state()} fallback={<>
            <text fg={theme.textMuted}>No active wave campaign.</text>
            <Show when={wave.data.campaigns.length}><text fg={theme.textMuted}>Archived: {wave.data.campaigns.join(", ")}</text></Show>
          </>}>
            {(current) => <>
              <box flexDirection="column" gap={1}>
                <text fg={theme.text}>Campaign: {current().campaign_id}</text>
                <text fg={theme.textMuted}>Plan: {current().plan_source || "—"}</text>
                <text fg={theme.textMuted}>Executor: {current().executor_agent || "—"} · {current().executor_model || "—"}</text>
                <text fg={theme.textMuted}>Loop: {current().loop_state} · Wave: {current().wave_status} · {current().session_count}/{current().total_waves} done</text>
                <Show when={current().wave_status === "awaiting_user" && current().user_question}>
                  <text fg={theme.warning} attributes={TextAttributes.BOLD}>USER ATTENTION: {current().user_question}</text>
                </Show>
              </box>
              <text fg={theme.textMuted}>  #   status      session              commit    notes</text>
              <For each={rows()}>{(row, index) => {
                const selected = () => index() === cursor()
                const session = row.session_id ? truncate(row.session_id, 18) : "—"
                return <text fg={selected() ? theme.text : row.status === "complete" ? theme.success : row.status === "failed" || row.status === "undoable" ? theme.error : theme.textMuted}>
                  {selected() ? "▸ " : "  "}{String(row.n).padEnd(4)} {row.status.padEnd(11)} {session.padEnd(20)} {(row.commit_sha || "—").slice(0, 9).padEnd(9)} {truncate(row.notes || "", Math.max(20, dimensions().width - 50))}
                </text>
              }}</For>
            </>}
          </Show>
        </Show>
      </Show>
      <Show when={!wave.available}><text fg={theme.error}>Wave service unavailable in this TUI mode.</text></Show>
      <text fg={theme.textMuted}>↑↓ navigate · r arm/resume · n next · space pause · i interrupt · s stop · f5 refresh · esc back</text>
    </box>
  )
}
