// Shared model catalog. OpenRouter models require user's BYO key or shared demo.
export const MODELS = [
  { label: "Claude Sonnet 4.6", provider: "anthropic", model: "claude-sonnet-4-6", tag: "closed" },
  { label: "Claude Haiku 4.5", provider: "anthropic", model: "claude-haiku-4-5-20251001", tag: "closed" },
  { label: "GPT-5.4", provider: "openai", model: "gpt-5.4", tag: "closed" },
  { label: "GPT-5.4 Mini", provider: "openai", model: "gpt-5.4-mini", tag: "closed" },
  { label: "Gemini 3 Flash", provider: "gemini", model: "gemini-3-flash-preview", tag: "closed" },
  { label: "Gemini 3.1 Pro", provider: "gemini", model: "gemini-3.1-pro-preview", tag: "closed" },
  // OpenRouter open-source
  { label: "Llama 3.3 70B (OR)", provider: "openrouter", model: "meta-llama/llama-3.3-70b-instruct", tag: "open" },
  { label: "Qwen 2.5 72B (OR)", provider: "openrouter", model: "qwen/qwen-2.5-72b-instruct", tag: "open" },
  { label: "DeepSeek V3 (OR)", provider: "openrouter", model: "deepseek/deepseek-chat", tag: "open" },
  { label: "Mistral Large (OR)", provider: "openrouter", model: "mistralai/mistral-large", tag: "open" },
  // Local (BYO base_url via Settings)
  { label: "Local · Ollama / LM Studio", provider: "local", model: "", tag: "local" },
];
