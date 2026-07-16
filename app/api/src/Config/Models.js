const MODEL_DEFINITIONS = Object.freeze(
  [
    {
      id: "deepseek-v4-pro",
      label: "DeepSeek V4 Pro",
      provider: "deepseek",
    },
    {
      id: "deepseek-v4-flash",
      label: "DeepSeek V4 Flash",
      provider: "deepseek",
    },
    { id: "z-ai/glm-5.2", label: "GLM-5.2", provider: "openrouter" },
    { id: "z-ai/glm-5.1", label: "GLM-5.1", provider: "openrouter" },
    {
      id: "qwen/qwen3.7-plus",
      label: "Qwen3.7 Plus",
      provider: "openrouter",
    },
    {
      id: "qwen/qwen3.7-max",
      label: "Qwen3.7 Max",
      provider: "openrouter",
    },
    {
      id: "qwen/qwen3.6-plus",
      label: "Qwen3.6 Plus",
      provider: "openrouter",
    },
    {
      id: "moonshotai/kimi-k2.6",
      label: "Kimi K2.6",
      provider: "openrouter",
    },
    {
      id: "minimax/minimax-m3",
      label: "MiniMax-M3",
      provider: "openrouter",
    },
    {
      id: "xiaomi/mimo-v2.5-pro",
      label: "MiMo V2.5 Pro",
      provider: "openrouter",
    },
    {
      id: "xiaomi/mimo-v2.5",
      label: "MiMo V2.5",
      provider: "openrouter",
    },
  ].map(Object.freeze),
);

const MODEL_CATALOG = Object.freeze(
  MODEL_DEFINITIONS.map(({ id, label }) => Object.freeze({ id, label })),
);
const MODEL_PROVIDER = "DeepSeek + OpenRouter";
const FALLBACK_MODEL = "deepseek-v4-flash";
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
  MODEL_CATALOG,
  MODEL_PROVIDER,
  resolveModel,
};
