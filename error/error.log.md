2026-03-15 00:43:06 [DEBUG]
 Received request: POST to /v1/chat/completions with body  {
  "model": "qwen/qwen3.5-9b",
  "messages": [
    {
      "role": "system",
      "content": "/no_think\nYou are a SQL expert for a Tally Prime a... <Truncated in logs> ... answer the user's question with ONLY a SQL query."
    },
    {
      "role": "assistant",
      "content": "Hello! Ask me anything about your Tally accounting... <Truncated in logs> ...eivables?\n• Which product sold the most last year?"
    },
    {
      "role": "user",
      "content": "what is my total sales this month"
    },
    {
      "role": "assistant",
      "content": "Sorry, I could not connect to the AI model. Please ensure LM Studio is running."
    },
    {
      "role": "user",
      "content": "what is my total sales this month"
    },
    {
      "role": "user",
      "content": "/no_think\nwhat is my total sales this month"
    }
  ],
  "max_tokens": 2048,
  "temperature": 0.1
}
2026-03-15 00:43:06  [INFO]
 [qwen/qwen3.5-9b] Running chat completion on conversation with 6 messages.
2026-03-15 00:43:06 [DEBUG]
 1 Error predicting: Error: Error rendering prompt with jinja template: "No user query found in messages.".

This is usually an issue with the model's prompt template. If you are using a popular model, you can try to search the model under lmstudio-community, which will have fixed prompt templates. If you cannot find one, you are welcome to post this issue to our discord or issue tracker on GitHub. Alternatively, if you know how to write jinja templates, you can override the prompt template in My Models > model settings > Prompt Template.
    at /Applications/LM Studio.app/Contents/Resources/app/.webpack/lib/llmworker.js:87:48463
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async _0x22b506.<computed> (/Applications/LM Studio.app/Contents/Resources/app/.webpack/lib/llmworker.js:87:40114)
    at async _0x14d665.<computed> (/Applications/LM Studio.app/Contents/Resources/app/.webpack/lib/llmworker.js:120:6747)
    at async _0x5516f0.temp_createLlamaPredictionArgs (/Applications/LM Studio.app/Contents/Resources/app/.webpack/lib/llmworker.js:33:2957)
    at async _0x5aebfb.LLMEngineWrapper.predictTokens (/Applications/LM Studio.app/Contents/Resources/app/.webpack/lib/llmworker.js:87:20083)
    at async _0x5743c2.predictTokens (/Applications/LM Studio.app/Contents/Resources/app/.webpack/lib/llmworker.js:126:19675)
    at async _0x5743c2.handleMessage (/Applications/LM Studio.app/Contents/Resources/app/.webpack/lib/llmworker.js:126:9273)
2026-03-15 00:43:06 [ERROR]
 [qwen/qwen3.5-9b] Error: Channel Error