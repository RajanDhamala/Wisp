const MODEL_CATALOG = Object.freeze(
  [

    { id: "glm-5.2", label: "GLM-5.2" },
    { id: "deepseek-v4-flash", label: "DeepSeek V4 Flash" },
    { id: "deepseek-v4-pro", label: "DeepSeek V4 Pro" },
    { id: "qwen3.7-plus", label: "Qwen3.7 Plus" },
    { id: "minimax-m3", label: "MiniMax-M3" },
    { id: "qwen3.7-max", label: "Qwen3.7 Max" },
    { id: "mimo-v2.5", label: "MiMo V2.5" },
    { id: "mimo-v2.5-pro", label: "MiMo V2.5 Pro" },
    { id: "kimi-k2.6", label: "Kimi K2.6" },
    { id: "glm-5.1", label: "GLM-5.1" },
    { id: "qwen3.6-plus", label: "Qwen3.6 Plus" },
    { id: "Mythos", label: "Mythos" },
    { id: "minimax-m2.7", label: "MiniMax-M2.7" },
  ].map(Object.freeze),
);

const MODEL_PROVIDER = "OpenCode Go";
const FALLBACK_MODEL = "deepseek-v4-pro";
const MODEL_IDS = new Set(MODEL_CATALOG.map((model) => model.id));

if (!MODEL_IDS.has(FALLBACK_MODEL)) {
  throw new Error("The fallback model must be included in MODEL_CATALOG");
}

const resolveModel = (model) =>
  typeof model === "string" && MODEL_IDS.has(model) ? model : FALLBACK_MODEL;

export { FALLBACK_MODEL, MODEL_CATALOG, MODEL_PROVIDER, resolveModel };
