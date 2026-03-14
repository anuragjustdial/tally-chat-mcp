import { Component, Show } from 'solid-js'
import type { Message } from '../api/chat.js'

interface Props {
  message: Message
  isLoading?: boolean
}

export const MessageBubble: Component<Props> = (props) => {
  const isUser = () => props.message.role === 'user'

  return (
    <div style={{
      display: 'flex',
      'justify-content': isUser() ? 'flex-end' : 'flex-start',
      margin: '8px 16px',
    }}>
      <div style={{
        'max-width': '80%',
        padding: '10px 14px',
        'border-radius': isUser() ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        background: isUser() ? '#2563eb' : '#ffffff',
        color: isUser() ? '#ffffff' : '#111827',
        'font-size': '14px',
        'line-height': '1.6',
        'white-space': 'pre-wrap',
        'font-family': isUser() ? 'inherit' : "'Courier New', monospace",
        'box-shadow': '0 1px 2px rgba(0,0,0,0.08)',
        border: isUser() ? 'none' : '1px solid #e5e7eb',
      }}>
        <Show when={!props.isLoading} fallback={<span style={{ opacity: '0.5' }}>Thinking…</span>}>
          {props.message.content}
        </Show>
      </div>
    </div>
  )
}
