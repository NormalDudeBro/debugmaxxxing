import { Button } from "@opencode-ai/ui/button"
import { useDialog } from "@opencode-ai/ui/context/dialog"
import { Dialog } from "@opencode-ai/ui/dialog"

export function DialogLearningConfirm(props: { title: string; description: string; action: string; onConfirm: () => void }) {
  const dialog = useDialog()
  return (
    <Dialog title={props.title} description={props.description} fit>
      <div class="flex justify-end gap-2 pl-6 pr-2.5 pb-3">
        <Button variant="ghost" size="large" onClick={() => dialog.close()}>Cancel</Button>
        <Button variant="primary" size="large" onClick={() => { dialog.close(); props.onConfirm() }}>{props.action}</Button>
      </div>
    </Dialog>
  )
}
