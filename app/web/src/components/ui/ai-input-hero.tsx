"use client";

import { ArrowRight } from "lucide-react";
import { type CSSProperties, useMemo } from "react";
import { Link } from "react-router-dom";
import grokLogo from "@lobehub/icons-static-svg/icons/grok.svg";
import { ChatSessionShowcase } from "@/components/ui/chat-session-showcase";
import { Navbar } from "@/components/ui/mini-navbar";
import {
  ModelProviderIcon,
  type CatalogModel,
} from "@/components/ui/model-provider-icons";

export type HeroWaveProps = {
  buttonText?: string;
  className?: string;
  destination: string;
  models: CatalogModel[];
  onModelSelect: (modelId: string) => void;
  onPromptSubmit?: (value: string, modelId: string) => void;
  onThemeToggle: () => void;
  placeholder?: string;
  selectedModelId: string;
  style?: CSSProperties;
  subtitle?: string;
  theme: "dark" | "light";
  title?: string;
};

const floatingPositions = [
  "left-[7%] top-[29%] -rotate-6",
  "right-[7%] top-[29%] rotate-6",
  "left-[7%] top-[54%] rotate-3",
  "right-[7%] top-[54%] -rotate-3",
  "left-[7%] top-[76%] -rotate-3",
  "right-[7%] top-[76%] rotate-3",
];

export function HeroWave({
  className = "",
  destination,
  models,
  onThemeToggle,
  selectedModelId,
  style,
  theme,
  title = "One workspace for every model you choose.",
}: HeroWaveProps) {
  const selectedModel = useMemo(
    () => models.find((model) => model.id === selectedModelId) ?? null,
    [models, selectedModelId],
  );
  const floatingModels = useMemo(() => {
    const preferred = selectedModel
      ? [selectedModel, ...models.filter((model) => model.id !== selectedModel.id)]
      : models;
    const upperModels = preferred
      .filter((model) => model.family !== "kimi")
      .slice(0, 4);
    const kimiModel = models.find((model) => model.family === "kimi");
    return kimiModel ? [...upperModels, kimiModel] : upperModels;
  }, [models, selectedModel]);

  return (
    <section
      aria-labelledby="wisp-hero-title"
      className={`relative isolate overflow-hidden bg-[#f7f7f6] text-stone-950 transition-colors dark:bg-[#070707] dark:text-white ${className}`}
      style={style}
    >
      <Navbar onThemeToggle={onThemeToggle} theme={theme} />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute inset-0 bg-[linear-gradient(rgba(24,24,27,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(24,24,27,0.04)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:linear-gradient(to_bottom,black,black_72%,transparent)] dark:bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)]" />
        <div className="absolute left-1/2 top-0 h-[46rem] w-[72rem] -translate-x-1/2 bg-[radial-gradient(ellipse,rgba(14,165,233,0.09),transparent_63%)] dark:bg-[radial-gradient(ellipse,rgba(34,211,238,0.045),transparent_63%)]" />
        <div className="absolute inset-x-0 top-[68px] h-px bg-gradient-to-r from-transparent via-sky-600/20 to-transparent dark:via-cyan-300/15" />

        {floatingModels.map((model, index) => (
          <div
            className={`absolute z-20 ${floatingPositions[index]} hidden xl:block`}
            key={model.id}
          >
            <div
              className={`wisp-model-orb flex size-16 items-center justify-center rounded-2xl border shadow-[0_24px_80px_rgba(24,24,27,0.16)] backdrop-blur-xl dark:border-white/[0.09] dark:bg-[#111113]/90 dark:shadow-[0_24px_80px_rgba(0,0,0,0.55)] ${model.family === "kimi" ? "border-stone-800 bg-stone-950" : "border-stone-900/[0.09] bg-white/80"}`}
              style={{ animationDelay: `${index * -1.4}s` }}
            >
              <ModelProviderIcon className="size-8" model={model} />
            </div>
          </div>
        ))}

        <div
          className={`absolute z-20 ${floatingPositions[5]} hidden xl:block`}
        >
          <div
            className="wisp-model-orb flex size-16 items-center justify-center rounded-2xl border border-stone-900/[0.09] bg-white/80 shadow-[0_24px_80px_rgba(24,24,27,0.16)] backdrop-blur-xl dark:border-white/[0.09] dark:bg-[#111113]/90 dark:shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
            style={{ animationDelay: "-7s" }}
          >
            <img
              alt=""
              aria-hidden="true"
              className="size-8 object-contain dark:invert"
              src={grokLogo}
            />
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center px-3 pb-20 pt-32 text-center sm:px-6 sm:pt-36">
        <h1
          className="max-w-5xl text-balance text-[3.35rem] font-medium leading-[0.97] tracking-[-0.065em] sm:text-7xl lg:text-[84px]"
          id="wisp-hero-title"
        >
          {title}
        </h1>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            className="group relative isolate inline-flex h-12 items-center gap-3 overflow-hidden rounded-2xl border border-stone-950 bg-stone-950 py-1.5 pl-5 pr-2 text-sm font-semibold text-white shadow-[0_14px_38px_-18px_rgba(14,165,233,0.65)] transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-500 hover:shadow-[0_18px_48px_-16px_rgba(14,165,233,0.8)] active:translate-y-0 active:scale-[0.98] dark:border-white dark:bg-white dark:text-stone-950 dark:shadow-[0_14px_38px_-18px_rgba(34,211,238,0.5)] dark:hover:border-cyan-300 dark:hover:shadow-[0_18px_48px_-16px_rgba(34,211,238,0.68)]"
            to={destination}
          >
            <span className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-sky-500/0 via-sky-500/20 to-cyan-300/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:from-cyan-300/0 dark:via-cyan-300/25 dark:to-cyan-300/0" />
            <span className="pointer-events-none absolute -left-16 top-[-60%] h-[220%] w-10 -rotate-12 bg-white/25 blur-sm transition-transform duration-700 ease-out group-hover:translate-x-[230px] dark:bg-cyan-200/45" />
            <span className="relative">Start chatting</span>
            <span className="relative flex size-8 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10 transition-all duration-300 group-hover:bg-sky-500 group-hover:ring-sky-300/40 dark:bg-stone-950/10 dark:ring-stone-950/10 dark:group-hover:bg-cyan-300">
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-rotate-6" />
            </span>
          </Link>
        </div>

        <div className="mt-16 w-full" id="branching">
          <ChatSessionShowcase />
        </div>
      </div>
    </section>
  );
}

export { HeroWave as AiInputHero };
