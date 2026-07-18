import type { ReactNode } from "react";
import claudeLogo from "@lobehub/icons-static-svg/icons/claude-color.svg";
import deepSeekLogo from "@lobehub/icons-static-svg/icons/deepseek-color.svg";
import kimiLogo from "@lobehub/icons-static-svg/icons/kimi.svg";
import minimaxLogo from "@lobehub/icons-static-svg/icons/minimax-color.svg";
import openAiLogo from "@lobehub/icons-static-svg/icons/openai.svg";
import qwenLogo from "@lobehub/icons-static-svg/icons/qwen-color.svg";
import xiaomiMimoLogo from "@lobehub/icons-static-svg/icons/xiaomimimo.svg";
import zaiLogo from "@lobehub/icons-static-svg/icons/zai.svg";

const MODEL_LOGOS: ReadonlyArray<{
  invertInDark?: boolean;
  match: string;
  src: string;
}> = [
  { match: "anthropic", src: claudeLogo },
  { match: "claude", src: claudeLogo },
  { match: "openai", src: openAiLogo, invertInDark: true },
  { match: "gpt", src: openAiLogo, invertInDark: true },
  { match: "deepseek", src: deepSeekLogo },
  { match: "minimax", src: minimaxLogo },
  { match: "qwen", src: qwenLogo },
  { match: "mimo", src: xiaomiMimoLogo, invertInDark: true },
  { match: "kimi", src: kimiLogo, invertInDark: true },
  { match: "glm", src: zaiLogo },
];

export const ModelLogo = ({
  className = "size-5",
  label,
  modelId,
}: {
  className?: string;
  label: string;
  modelId?: string | null;
}) => {
  const modelLogo = MODEL_LOGOS.find(({ match }) =>
    modelId?.toLowerCase().includes(match),
  );

  if (!modelLogo) {
    return (
      <span
        aria-hidden="true"
        className={`${className} flex items-center justify-center rounded-md bg-zinc-900 text-[0.55em] font-bold uppercase text-white dark:bg-white dark:text-zinc-950`}
      >
        {label.trim().charAt(0) || "W"}
      </span>
    );
  }

  return (
    <img
      alt=""
      aria-hidden="true"
      className={`${className} object-contain ${modelLogo.invertInDark ? "dark:invert" : ""}`}
      src={modelLogo.src}
    />
  );
};

export const IconButton = ({
  label,
  children,
  className = "",
  disabled = false,
  onClick,
  pressed,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  pressed?: boolean;
}) => (
  <button
    aria-label={label}
    aria-pressed={pressed}
    className={`inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-200/70 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 ${className}`}
    disabled={disabled}
    onClick={onClick}
    type="button"
  >
    {children}
  </button>
);
