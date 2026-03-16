import { Component, createSignal, For } from 'solid-js'
import { sendMessage, type Message } from './api/chat.js'
import { MessageBubble } from './components/MessageBubble.js'
import { QueryInput } from './components/QueryInput.js'

const now = () =>
  new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

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
  timestamp: now(),
}

const App: Component = () => {
  const [messages, setMessages] = createSignal<Message[]>([WELCOME])
  const [loading, setLoading] = createSignal(false)
  let bottomRef: HTMLDivElement | undefined

  const scrollToBottom = () =>
    bottomRef?.scrollIntoView({ behavior: 'smooth' })

  const handleSend = async (text: string) => {
    const rawHistory = messages().slice(-10)
    const firstUserIdx = rawHistory.findIndex((m) => m.role === 'user')
    const history = firstUserIdx >= 0 ? rawHistory.slice(firstUserIdx) : []

    const userMsg: Message = { role: 'user', content: text, timestamp: now() }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)
    setTimeout(scrollToBottom, 50)

    try {
      const response = await sendMessage(text, history)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: response.answer, timestamp: now() },
      ])
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Error: ${e instanceof Error ? e.message : String(e)}`,
          timestamp: now(),
        },
      ])
    } finally {
      setLoading(false)
      setTimeout(scrollToBottom, 50)
    }
  }

  return (
    <div class="relative flex h-screen w-full flex-col overflow-hidden max-w-2xl mx-auto border-x border-slate-200 bg-white">
      {/* Header */}
      <header class="flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10">
        <div class="flex items-center gap-3">
          <div class="relative">
            <div class="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white text-lg select-none shrink-0">
              📊
            </div>
            <div class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
          </div>
          <div>
            <h2 class="text-base font-bold leading-tight tracking-tight text-slate-900">Tally Chat</h2>
            <p class="text-xs font-medium text-green-500">Online</p>
          </div>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="text-xs text-slate-400 font-medium">Connected</span>
          <span class="w-2 h-2 rounded-full bg-green-400 inline-block" />
        </div>
      </header>

      {/* Message list */}
      <main class="flex-1 overflow-y-auto p-4 space-y-6 chat-scroll">
        {/* Date separator */}
        <div class="flex justify-center">
          <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-1 rounded">
            Today
          </span>
        </div>

        <For each={messages()}>
          {(msg) => <MessageBubble message={msg} />}
        </For>

        {loading() && (
          <MessageBubble message={{ role: 'assistant', content: '' }} isLoading />
        )}

        <div ref={bottomRef} class="h-px" />
      </main>

      {/* Input */}
      <QueryInput onSend={handleSend} disabled={loading()} />
    </div>
  )
}

export default App
