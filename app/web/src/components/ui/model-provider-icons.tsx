/* eslint-disable react-refresh/only-export-components -- model metadata and its official icon resolver intentionally share one source of truth */
import claudeLogo from "@lobehub/icons-static-svg/icons/claude-color.svg";
import deepSeekLogo from "@lobehub/icons-static-svg/icons/deepseek-color.svg";
import kimiLogo from "@lobehub/icons-static-svg/icons/kimi-color.svg";
import minimaxLogo from "@lobehub/icons-static-svg/icons/minimax-color.svg";
import openAiLogo from "@lobehub/icons-static-svg/icons/openai.svg";
import openRouterLogo from "@lobehub/icons-static-svg/icons/openrouter-color.svg";
import qwenLogo from "@lobehub/icons-static-svg/icons/qwen-color.svg";
import xiaomiMimoLogo from "@lobehub/icons-static-svg/icons/xiaomimimo.svg";
import zaiLogo from "@lobehub/icons-static-svg/icons/zai.svg";

export type ModelFamily =
  | "claude"
  | "deepseek"
  | "glm"
  | "kimi"
  | "mimo"
  | "minimax"
  | "openai"
  | "qwen";

export type CatalogModel = {
  capability: string;
  family: ModelFamily;
  id: string;
  label: string;
  provider: "deepseek" | "openrouter";
};

export type ModelCatalogResponse = {
  fallbackModel: string;
  models: CatalogModel[];
  provider: string;
};

export type ModelIdentity = CatalogModel & {
  category: string;
};

const MODEL_ASSETS: Record<
  ModelFamily,
  { invertInDark?: boolean; src: string }
> = {
  claude: { src: claudeLogo },
  deepseek: { src: deepSeekLogo },
  glm: { invertInDark: true, src: zaiLogo },
  kimi: { src: kimiLogo },
  mimo: { invertInDark: true, src: xiaomiMimoLogo },
  minimax: { src: minimaxLogo },
  openai: { invertInDark: true, src: openAiLogo },
  qwen: { src: qwenLogo },
};

export const resolveModelFamily = (
  modelId: string,
  label = "",
): ModelFamily | null => {
  const value = `${modelId} ${label}`.toLowerCase();
  if (value.includes("claude") || value.includes("anthropic")) return "claude";
  if (value.includes("deepseek")) return "deepseek";
  if (value.includes("glm") || value.includes("z-ai")) return "glm";
  if (value.includes("kimi") || value.includes("moonshot")) return "kimi";
  if (value.includes("mimo") || value.includes("xiaomi")) return "mimo";
  if (value.includes("minimax")) return "minimax";
  if (value.includes("gpt") || value.includes("openai")) return "openai";
  if (value.includes("qwen")) return "qwen";
  return null;
};

const identity = (
  family: ModelFamily,
  id: string,
  label: string,
  capability: string,
  provider: CatalogModel["provider"] = "openrouter",
): ModelIdentity => ({
  capability,
  category: capability,
  family,
  id,
  label,
  provider,
});

export const MODEL_IDENTITIES = {
  claude: identity(
    "claude",
    "anthropic/claude-fable-5",
    "Claude Fable 5",
    "Autonomous knowledge work",
  ),
  openai: identity(
    "openai",
    "openai/gpt-5.6-sol",
    "GPT-5.6 Sol",
    "Frontier reasoning",
  ),
  deepseek: identity(
    "deepseek",
    "deepseek-v4-pro",
    "DeepSeek V4 Pro",
    "Reasoning and coding",
    "deepseek",
  ),
  deepseekFlash: identity(
    "deepseek",
    "deepseek-v4-flash",
    "DeepSeek V4 Flash",
    "Fast, efficient chat",
    "deepseek",
  ),
  qwen: identity(
    "qwen",
    "qwen/qwen3.7-plus",
    "Qwen 3.7 Plus",
    "Multilingual reasoning",
  ),
  kimiCode: identity(
    "kimi",
    "moonshotai/kimi-k2.7-code",
    "Kimi K2.7 Code",
    "Long-context coding",
  ),
  kimi: identity(
    "kimi",
    "moonshotai/kimi-k2.6",
    "Kimi K2.6",
    "Long-context multimodal work",
  ),
  minimax: identity(
    "minimax",
    "minimax/minimax-m3",
    "MiniMax M3",
    "Multimodal agents",
  ),
  glm: identity(
    "glm",
    "z-ai/glm-5.2",
    "GLM 5.2",
    "General purpose",
  ),
  glm51: identity(
    "glm",
    "z-ai/glm-5.1",
    "GLM 5.1",
    "General-purpose chat",
  ),
  qwenMax: identity(
    "qwen",
    "qwen/qwen3.7-max",
    "Qwen 3.7 Max",
    "Maximum-quality reasoning",
  ),
  qwen36: identity(
    "qwen",
    "qwen/qwen3.6-plus",
    "Qwen 3.6 Plus",
    "Efficient multilingual chat",
  ),
  mimo: identity(
    "mimo",
    "xiaomi/mimo-v2.5-pro",
    "MiMo V2.5 Pro",
    "Efficient reasoning",
  ),
  mimo25: identity(
    "mimo",
    "xiaomi/mimo-v2.5",
    "MiMo V2.5",
    "Low-cost everyday chat",
  ),
} satisfies Record<string, ModelIdentity>;

export const LANDING_MODELS = Object.values(MODEL_IDENTITIES);

export function ModelProviderIcon({
  className = "size-5",
  model,
}: {
  className?: string;
  model: Pick<CatalogModel, "family" | "id" | "label">;
}) {
  const family = model.family ?? resolveModelFamily(model.id, model.label);
  const asset = family ? MODEL_ASSETS[family] : null;

  if (!asset) {
    return (
      <span
        aria-hidden="true"
        className={`${className} flex items-center justify-center rounded-md bg-zinc-900 text-[0.55em] font-bold uppercase text-white dark:bg-white dark:text-zinc-950`}
      >
        {model.label.trim().charAt(0) || "W"}
      </span>
    );
  }

  return (
    <img
      alt=""
      aria-hidden="true"
      className={`${className} object-contain ${asset.invertInDark ? "dark:invert" : ""}`}
      src={asset.src}
    />
  );
}

export function ProviderIcon({
  className = "size-5",
  provider,
}: {
  className?: string;
  provider: "deepseek" | "openrouter";
}) {
  return (
    <img
      alt=""
      aria-hidden="true"
      className={`${className} object-contain`}
      src={provider === "deepseek" ? deepSeekLogo : openRouterLogo}
    />
  );
}

export function WispMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 32 32"
    >
      <path
        d="M7 9.5c2.6-3 5.5-4.5 8.8-4.5 4.8 0 8 2.8 8 6.3 0 5-5.6 5.5-10.2 5.9-3.6.3-6.4.8-6.4 3.5 0 2.6 2.7 4.3 6.6 4.3 3.5 0 6.6-1.3 9.2-4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.2"
      />
      <path
        d="M10.2 12.1c1.7-1.8 3.5-2.7 5.6-2.7 2.5 0 4.2 1 4.2 2.4 0 1.6-2 2-5.5 2.3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.2"
      />
    </svg>
  );
}
