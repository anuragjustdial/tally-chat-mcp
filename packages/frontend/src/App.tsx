import { Component, createSignal, For } from 'solid-js'
import { sendMessage, type Message } from './api/chat.js'
import { MessageBubble } from './components/MessageBubble.js'
import { QueryInput } from './components/QueryInput.js'

const WELCOME: Message = {
  role: 'assistant',
  content: [
    'Hello! Ask me anything about your Tally accounting data.',
    '',
    'Examples:',
    '• What were my total sales this month?',
    '• Show top 10 customers by revenue',
    '• What is my outstanding receivables?',
    '• Which product sold the most last year?',
  ].join('\n'),
}

const App: Component = () => {
  const [messages, setMessages] = createSignal<Message[]>([WELCOME])
  const [loading, setLoading] = createSignal(false)
  let bottomRef: HTMLDivElement | undefined

  const scrollToBottom = () =>
    bottomRef?.scrollIntoView({ behavior: 'smooth' })

  const handleSend = async (text: string) => {
    // Capture history BEFORE adding the current message to avoid duplicates.
    // Also drop any leading assistant messages (e.g. the welcome message) —
    // Qwen3's jinja template requires history to start with a user message.
    const rawHistory = messages().slice(-10)
    const firstUserIdx = rawHistory.findIndex((m) => m.role === 'user')
    const history = firstUserIdx >= 0 ? rawHistory.slice(firstUserIdx) : []

    const userMsg: Message = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)
    setTimeout(scrollToBottom, 50)

    try {
      const response = await sendMessage(text, history)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: response.answer },
      ])
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Error: ${e instanceof Error ? e.message : String(e)}`,
        },
      ])
    } finally {
      setLoading(false)
      setTimeout(scrollToBottom, 50)
    }
  }

  return (
    <div style={{
      display: 'flex',
      'flex-direction': 'column',
      height: '100vh',
      'max-width': '900px',
      margin: '0 auto',
      background: '#f9fafb',
    }}>
      {/* Header */}
      <header style={{
        padding: '14px 20px',
        background: '#ffffff',
        'border-bottom': '1px solid #e5e7eb',
        display: 'flex',
        'align-items': 'center',
        gap: '10px',
      }}>
        <span style={{ 'font-size': '20px' }}>📊</span>
        <div>
          <div style={{ 'font-weight': '600', 'font-size': '16px', color: '#111827' }}>
            Tally Chat
          </div>
          <div style={{ 'font-size': '12px', color: '#6b7280' }}>
            Ask questions about your accounting data
          </div>
        </div>
      </header>

      {/* Message list */}
      <div style={{
        flex: '1',
        overflow: 'auto',
        padding: '12px 0',
      }}>
        <For each={messages()}>
          {(msg) => <MessageBubble message={msg} />}
        </For>
        {loading() && (
          <MessageBubble
            message={{ role: 'assistant', content: '' }}
            isLoading
          />
        )}
        <div ref={bottomRef} style={{ height: '1px' }} />
      </div>

      {/* Input */}
      <QueryInput onSend={handleSend} disabled={loading()} />
    </div>
  )
}

export default App
