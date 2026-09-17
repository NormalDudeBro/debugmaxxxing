import { For } from "solid-js"
import { useTheme } from "../context/theme"
import { logo } from "../logo"

export function Logo() {
  const { theme } = useTheme()

  return (
    <box gap={1}>
      <For each={logo.left}>
        {(line, index) => <text fg={theme.text} selectable={false}><b>{line}{logo.right[index()]}</b></text>}
      </For>
    </box>
  )
}
