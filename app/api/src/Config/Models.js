const MODEL_DEFINITIONS = Object.freeze(
  [
    {
      capability: "Autonomous knowledge work",
      family: "claude",
      id: "anthropic/claude-fable-5",
      label: "Claude Fable 5",
      provider: "openrouter",
    },
    {
      capability: "Frontier reasoning",
      family: "openai",
      id: "openai/gpt-5.6-sol",
      label: "GPT-5.6 Sol",
      provider: "openrouter",
    },
    {
      capability: "Advanced reasoning and coding",
      family: "deepseek",
      id: "deepseek-v4-pro",
      label: "DeepSeek V4 Pro",
      provider: "deepseek",
    },
    {
      capability: "Fast, efficient chat",
      family: "deepseek",
      id: "deepseek-v4-flash",
      label: "DeepSeek V4 Flash",
      provider: "deepseek",
    },
    {
      capability: "Long-context coding",
      family: "kimi",
      id: "moonshotai/kimi-k2.7-code",
      label: "Kimi K2.7 Code",
      provider: "openrouter",
    },
    {
      capability: "Long-context multimodal work",
      family: "kimi",
      id: "moonshotai/kimi-k2.6",
      label: "Kimi K2.6",
      provider: "openrouter",
    },
    {
      capability: "Multimodal agents and coding",
      family: "minimax",
      id: "minimax/minimax-m3",
      label: "MiniMax M3",
      provider: "openrouter",
    },
    {
      capability: "General-purpose intelligence",
      family: "glm",
      id: "z-ai/glm-5.2",
      label: "GLM-5.2",
      provider: "openrouter",
    },
    {
      capability: "General-purpose chat",
      family: "glm",
      id: "z-ai/glm-5.1",
      label: "GLM-5.1",
      provider: "openrouter",
    },
    {
      capability: "Multilingual reasoning",
      family: "qwen",
      id: "qwen/qwen3.7-plus",
      label: "Qwen3.7 Plus",
      provider: "openrouter",
    },
    {
      capability: "Maximum-quality reasoning",
      family: "qwen",
      id: "qwen/qwen3.7-max",
      label: "Qwen3.7 Max",
      provider: "openrouter",
    },
    {
      capability: "Efficient multilingual chat",
      family: "qwen",
      id: "qwen/qwen3.6-plus",
      label: "Qwen3.6 Plus",
      provider: "openrouter",
    },
    {
      capability: "Efficient advanced reasoning",
      family: "mimo",
      id: "xiaomi/mimo-v2.5-pro",
      label: "MiMo V2.5 Pro",
      provider: "openrouter",
    },
    {
      capability: "Low-cost everyday chat",
      family: "mimo",
      id: "xiaomi/mimo-v2.5",
      label: "MiMo V2.5",
      provider: "openrouter",
    },

    {
      capability: "Largest open reasoning model (Free)",
      family: "nvidia",
      id: "nvidia/nemotron-3-ultra-550b-a55b:free",
      label: "Nemotron 3 Ultra",
      provider: "openrouter",
    },
    {
      capability: "High-performance reasoning (Free)",
      family: "nvidia",
      id: "nvidia/nemotron-3-super-120b-a12b:free",
      label: "Nemotron 3 Super",
      provider: "openrouter",
    },

    {
      capability: "Automatically routes to the best free model",
      family: "openrouter",
      id: "openrouter/free",
      label: "auto",
      provider: "openrouter",
    },
  ].map(Object.freeze),
);

const MODEL_CATALOG = Object.freeze(
  MODEL_DEFINITIONS.map(({ capability, family, id, label, provider }) =>
    Object.freeze({ capability, family, id, label, provider }),
  ),
);
const MODEL_PROVIDER = "DeepSeek + OpenRouter";
const FALLBACK_MODEL = "deepseek-v4-flash";
const MEMORY_MODEL = "deepseek-v4-flash";
const MAX_PROVIDER_OUTPUT_TOKENS = 8_192;
const MODEL_IDS = new Set(MODEL_CATALOG.map((model) => model.id));
const MODEL_PROVIDERS = new Map(
  MODEL_DEFINITIONS.map(({ id, provider }) => [id, provider]),
);

if (!MODEL_IDS.has(FALLBACK_MODEL)) {
  throw new Error("The fallback model must be included in MODEL_CATALOG");
}

const resolveModel = (model) =>
  typeof model === "string" && MODEL_IDS.has(model) ? model : FALLBACK_MODEL;

const getModelProvider = (model) =>
  MODEL_PROVIDERS.get(resolveModel(model)) ?? "deepseek";

export {
  FALLBACK_MODEL,
  getModelProvider,
  MAX_PROVIDER_OUTPUT_TOKENS,
  MEMORY_MODEL,
  MODEL_CATALOG,
  MODEL_PROVIDER,
  resolveModel,
};
