import { Component, createSignal } from 'solid-js'

interface Props {
  onSend: (message: string) => void
  disabled: boolean
}

export const QueryInput: Component<Props> = (props) => {
  const [text, setText] = createSignal('')

  const handleSend = () => {
    const msg = text().trim()
    if (!msg || props.disabled) return
    props.onSend(msg)
    setText('')
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const canSend = () => !props.disabled && !!text().trim()

  return (
    <footer class="p-4 bg-white border-t border-slate-200 shrink-0">
      <div class="flex gap-2 items-center">
        <div class="flex-1 flex items-center bg-slate-100 rounded-2xl px-3 py-1.5 gap-2 border border-transparent focus-within:border-primary/30 transition-all">
          <textarea
            value={text()}
            onInput={(e) => setText(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={props.disabled}
            rows={1}
            class="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 resize-none max-h-32 text-slate-900 placeholder-slate-500 outline-none font-[inherit] leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!canSend()}
          class="flex w-11 h-11 items-center justify-center rounded-full text-white transition-all active:scale-95 shrink-0 disabled:cursor-not-allowed"
          style={{
            background: canSend() ? '#135bec' : '#e2e8f0',
            'box-shadow': canSend() ? '0 4px 14px rgba(19,91,236,0.25)' : 'none',
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5" style={{ color: canSend() ? 'white' : '#94a3b8' }}>
            <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.155.75.75 0 0 0 0-1.114A28.897 28.897 0 0 0 3.105 2.288Z" />
          </svg>
        </button>
      </div>
      <div class="h-2" />
    </footer>
  )
}
