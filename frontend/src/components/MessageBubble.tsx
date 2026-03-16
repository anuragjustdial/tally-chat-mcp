import { Component, Show } from 'solid-js'
import type { Message } from '../api/chat.js'

interface Props {
  message: Message
  isLoading?: boolean
}

export const MessageBubble: Component<Props> = (props) => {
  const isUser = () => props.message.role === 'user'

  return (
    <Show
      when={isUser()}
      fallback={
        /* Assistant (received) — left-aligned with avatar */
        <div class="flex items-end gap-2 max-w-[85%]">
          <div class="w-8 h-8 shrink-0 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm mb-1">
            🤖
          </div>
          <div class="flex flex-col gap-1">
            <div class="bg-slate-100 text-slate-900 px-4 py-2.5 rounded-2xl rounded-bl-none shadow-sm">
              <Show
                when={!props.isLoading}
                fallback={
                  /* Typing indicator */
                  <span class="flex items-center gap-1 py-0.5">
                    <span class="w-1.5 h-1.5 bg-slate-400 rounded-full dot-bounce inline-block" style={{ 'animation-delay': '0ms' }} />
                    <span class="w-1.5 h-1.5 bg-slate-400 rounded-full dot-bounce inline-block" style={{ 'animation-delay': '150ms' }} />
                    <span class="w-1.5 h-1.5 bg-slate-400 rounded-full dot-bounce inline-block" style={{ 'animation-delay': '300ms' }} />
                  </span>
                }
              >
                <p class="text-sm leading-relaxed whitespace-pre-wrap">{props.message.content}</p>
              </Show>
            </div>
            <Show when={props.message.timestamp && !props.isLoading}>
              <span class="text-[10px] text-slate-400 ml-1">{props.message.timestamp}</span>
            </Show>
          </div>
        </div>
      }
    >
      {/* User (sent) — right-aligned */}
      <div class="flex flex-col items-end gap-1 ml-auto max-w-[85%]">
        <div class="bg-primary text-white px-4 py-2.5 rounded-2xl rounded-br-none shadow-sm" style={{ 'box-shadow': '0 1px 3px rgba(19,91,236,0.2)' }}>
          <p class="text-sm leading-relaxed whitespace-pre-wrap">{props.message.content}</p>
        </div>
        <Show when={props.message.timestamp}>
          <div class="flex items-center gap-1 mr-1">
            <span class="text-[10px] text-slate-400">{props.message.timestamp}</span>
            {/* Double-check sent indicator */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3.5 h-3.5 text-primary">
              <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" />
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3.5 h-3.5 text-primary -ml-2">
              <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" />
            </svg>
          </div>
        </Show>
      </div>
    </Show>
  )
}
