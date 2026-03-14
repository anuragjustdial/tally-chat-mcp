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

  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      padding: '12px 16px',
      'border-top': '1px solid #e5e7eb',
      background: '#ffffff',
    }}>
      <textarea
        value={text()}
        onInput={(e) => setText(e.currentTarget.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about your Tally data… (Enter to send, Shift+Enter for newline)"
        disabled={props.disabled}
        rows={2}
        style={{
          flex: '1',
          padding: '10px 14px',
          'border-radius': '12px',
          border: '1px solid #d1d5db',
          resize: 'none',
          'font-size': '14px',
          outline: 'none',
          'font-family': 'inherit',
          transition: 'border-color 0.15s',
        }}
      />
      <button
        onClick={handleSend}
        disabled={props.disabled || !text().trim()}
        style={{
          padding: '10px 20px',
          background: props.disabled || !text().trim() ? '#93c5fd' : '#2563eb',
          color: '#ffffff',
          border: 'none',
          'border-radius': '12px',
          cursor: props.disabled ? 'not-allowed' : 'pointer',
          'font-size': '14px',
          'font-weight': '500',
          'align-self': 'flex-end',
          transition: 'background 0.15s',
        }}
      >
        Send
      </button>
    </div>
  )
}
