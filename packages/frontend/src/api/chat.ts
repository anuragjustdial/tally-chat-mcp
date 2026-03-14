const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatResponse {
  answer: string
  sql?: string
  error?: boolean
}

export async function sendMessage(
  message: string,
  history: Message[]
): Promise<ChatResponse> {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Server error ${res.status}: ${text}`)
  }

  return res.json() as Promise<ChatResponse>
}
