"use client";

import { ArrowUp, ChevronDown, GitBranch, Sparkles, Zap } from "lucide-react";
import {
  type CSSProperties,
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Navbar } from "@/components/ui/mini-navbar";
import {
  ModelProviderIcon,
  ProviderIcon,
  type CatalogModel,
} from "@/components/ui/model-provider-icons";

export type HeroWaveProps = {
  buttonText?: string;
  className?: string;
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

const suggestions = [
  "Ask a model to explain a difficult idea...",
  "Plan the architecture for my next product...",
  "Review this code and suggest improvements...",
  "Turn these rough notes into a clear proposal...",
];

export function HeroWave({
  buttonText = "Start chatting",
  className = "",
  models,
  onModelSelect,
  onPromptSubmit,
  onThemeToggle,
  placeholder,
  selectedModelId,
  style,
  subtitle = "Choose Claude Fable 5, GPT-5.6 Sol, DeepSeek V4, Kimi, MiniMax and more. Chat with one model at a time, or branch a prompt across several when you want to compare.",
  theme,
  title = "The AI models you want. One affordable place.",
}: HeroWaveProps) {
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const selectedModel = useMemo(
    () => models.find((model) => model.id === selectedModelId) ?? null,
    [models, selectedModelId],
  );
  const orbitModels = useMemo(() => {
    const preferred = selectedModel
      ? [selectedModel, ...models.filter((model) => model.id !== selectedModel.id)]
      : models;
    return preferred.slice(0, 4);
  }, [models, selectedModel]);

  useEffect(() => {
    if (prompt || placeholder) return;
    const interval = window.setInterval(() => {
      setSuggestionIndex((current) => (current + 1) % suggestions.length);
    }, 3_000);
    return () => window.clearInterval(interval);
  }, [placeholder, prompt]);

  const submitPrompt = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = prompt.trim();
    if (value && selectedModel) onPromptSubmit?.(value, selectedModel.id);
  };

  return (
    <section
      aria-labelledby="wisp-hero-title"
      className={`relative isolate min-h-[900px] overflow-hidden bg-[#f7f7f6] text-stone-950 transition-colors dark:bg-[#070707] dark:text-white sm:min-h-[980px] ${className}`}
      style={style}
    >
      <Navbar onThemeToggle={onThemeToggle} theme={theme} />

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-26rem] size-[70rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(14,165,233,0.13),rgba(251,113,133,0.045)_34%,transparent_68%)] blur-2xl dark:bg-[radial-gradient(circle,rgba(14,165,233,0.07),rgba(251,113,133,0.025)_34%,transparent_68%)]" />
        <div className="absolute inset-x-0 top-[68px] h-px bg-gradient-to-r from-transparent via-sky-600/20 to-transparent dark:via-cyan-300/15" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(28,25,23,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(28,25,23,0.035)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_72%)] dark:bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)]" />

        <svg className="absolute left-1/2 top-20 h-[760px] w-[1200px] -translate-x-1/2 opacity-70" fill="none" viewBox="0 0 1200 760">
          <defs>
            <linearGradient id="hero-network-line" x1="190" x2="1010" y1="140" y2="650">
              <stop stopColor="#0284c7" stopOpacity="0" />
              <stop offset="0.5" stopColor="#22d3ee" stopOpacity="0.45" />
              <stop offset="1" stopColor="#fb7185" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="hero-network-core">
              <stop stopColor="#38bdf8" stopOpacity="0.12" />
              <stop offset="1" stopColor="#38bdf8" stopOpacity="0" />
            </radialGradient>
            <filter id="hero-network-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="5" />
            </filter>
          </defs>
          <circle cx="600" cy="390" fill="url(#hero-network-core)" r="210" />
          {[
            "M600 390 C460 280 340 220 175 210",
            "M600 390 C730 270 860 225 1020 195",
            "M600 390 C430 455 340 555 235 635",
            "M600 390 C760 455 850 550 985 625",
          ].map((path, index) => (
            <g key={path}>
              <path className="wisp-network-path" d={path} id={`hero-network-path-${index}`} pathLength="1" stroke="url(#hero-network-line)" strokeWidth="1" />
              <circle fill={index % 2 ? "#fb7185" : "#22d3ee"} filter="url(#hero-network-glow)" r="4">
                <animateMotion begin={`${index * -0.9}s`} dur={`${3.8 + index * 0.45}s`} repeatCount="indefinite">
                  <mpath href={`#hero-network-path-${index}`} />
                </animateMotion>
              </circle>
              <circle fill={index % 2 ? "#fda4af" : "#67e8f9"} r="2.2">
                <animateMotion begin={`${index * -0.9}s`} dur={`${3.8 + index * 0.45}s`} repeatCount="indefinite">
                  <mpath href={`#hero-network-path-${index}`} />
                </animateMotion>
              </circle>
            </g>
          ))}
          <circle className="wisp-network-ring" cx="600" cy="390" r="78" stroke="#22d3ee" strokeDasharray="2 9" strokeOpacity="0.2" />
          <circle className="wisp-network-ring-reverse" cx="600" cy="390" r="110" stroke="#fb7185" strokeDasharray="1 13" strokeOpacity="0.13" />
        </svg>

        {orbitModels.map((model, index) => {
          const positions = [
            "left-[9%] top-[28%]",
            "right-[8%] top-[25%]",
            "left-[16%] bottom-[17%]",
            "right-[14%] bottom-[15%]",
          ];
          return (
            <div className={`wisp-model-orb absolute ${positions[index]} hidden items-center gap-2 rounded-xl border border-stone-900/[0.08] bg-white/85 px-2.5 py-2 shadow-[0_18px_60px_rgba(24,24,27,0.1)] backdrop-blur-xl dark:border-white/[0.09] dark:bg-[#0d0d0d]/85 dark:shadow-[0_18px_60px_rgba(0,0,0,0.5)] lg:flex`} key={model.id} style={{ animationDelay: `${index * -1.5}s` }}>
              <span className="flex size-7 items-center justify-center rounded-lg border border-stone-900/[0.07] bg-white/60 dark:border-white/[0.07] dark:bg-white/[0.04]">
                <ModelProviderIcon className="size-4" model={model} />
              </span>
              <div>
                <p className="text-[9px] font-semibold text-stone-800 dark:text-stone-200">{model.label}</p>
                <p className="text-[8px] text-stone-500 dark:text-stone-600">Available</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="relative z-10 mx-auto flex min-h-[900px] w-full max-w-6xl flex-col items-center px-4 pb-32 pt-36 text-center sm:min-h-[980px] sm:px-6 sm:pt-44">
        <div className="inline-flex items-center gap-2 rounded-full border border-stone-900/[0.08] bg-white/45 px-3 py-1.5 text-[10px] font-medium text-stone-700 shadow-sm backdrop-blur-xl dark:border-white/[0.09] dark:bg-white/[0.035] dark:text-stone-300 sm:text-[11px]">
          <span className="relative flex size-4 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-sky-500/20" />
            <Sparkles className="relative size-3 text-sky-600 dark:text-cyan-300" />
          </span>
          You choose the model. Wisp keeps the price simple.
        </div>

        <h1 className="mt-8 max-w-5xl text-balance text-[3.35rem] font-semibold leading-[0.94] tracking-[-0.065em] sm:text-7xl lg:text-[88px]" id="wisp-hero-title">
          {title}
        </h1>
        <p className="mt-7 max-w-3xl text-pretty text-sm leading-6 text-stone-600 dark:text-stone-400 sm:text-base sm:leading-7">{subtitle}</p>

        <form className="mt-9 w-full max-w-3xl sm:mt-11" onSubmit={submitPrompt}>
          <div className="relative rounded-[24px] bg-gradient-to-br from-sky-500/55 via-stone-900/10 to-rose-400/30 p-px shadow-[0_30px_100px_-30px_rgba(14,165,233,0.2)] dark:via-white/10 dark:shadow-[0_30px_100px_-28px_rgba(14,165,233,0.14)]">
            <div className="rounded-[23px] bg-white/95 p-2.5 text-left backdrop-blur-2xl dark:bg-[#0e0e0e]/95 sm:p-3">
              <textarea
                aria-label="Message your selected model"
                className="min-h-28 w-full resize-none bg-transparent px-3 py-3 text-[15px] leading-6 text-stone-950 outline-none placeholder:text-stone-400 dark:text-white dark:placeholder:text-stone-600 sm:min-h-32 sm:px-4 sm:py-4 sm:text-base"
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={placeholder ?? suggestions[suggestionIndex]}
                rows={4}
                value={prompt}
              />
              <div className="flex items-center justify-between gap-3 border-t border-stone-900/[0.07] px-1 pt-2.5 dark:border-white/[0.06] sm:px-2">
                <div className="relative min-w-0">
                  <button
                    aria-expanded={modelMenuOpen}
                    aria-haspopup="listbox"
                    className="flex h-9 max-w-[190px] items-center gap-2 rounded-xl border border-stone-900/[0.08] bg-white/60 px-2.5 text-[10px] font-medium text-stone-700 transition-colors hover:bg-white dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-stone-300 dark:hover:bg-white/[0.07] sm:max-w-[250px]"
                    onClick={() => setModelMenuOpen((open) => !open)}
                    type="button"
                  >
                    {selectedModel ? (
                      <ModelProviderIcon className="size-4 shrink-0" model={selectedModel} />
                    ) : (
                      <Sparkles className="size-4 shrink-0 text-sky-500" />
                    )}
                    <span className="truncate">{selectedModel?.label ?? "Choose a model"}</span>
                    <ChevronDown className={`size-3.5 shrink-0 transition-transform ${modelMenuOpen ? "rotate-180" : ""}`} />
                  </button>
                  {modelMenuOpen && (
                    <div className="absolute bottom-[calc(100%+10px)] left-0 z-50 w-[min(22rem,calc(100vw-2.5rem))] overflow-hidden rounded-2xl border border-stone-200 bg-white p-2 shadow-2xl dark:border-white/[0.09] dark:bg-[#121212]" role="listbox">
                      <p className="px-2 pb-2 pt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-sky-700 dark:text-cyan-300">Choose your model</p>
                      <div className="subtle-scrollbar max-h-72 overflow-y-auto">
                        {models.map((model) => (
                          <button
                            aria-selected={model.id === selectedModelId}
                            className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors ${model.id === selectedModelId ? "bg-sky-500/10" : "hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"}`}
                            key={model.id}
                            onClick={() => {
                              onModelSelect(model.id);
                              setModelMenuOpen(false);
                            }}
                            role="option"
                            type="button"
                          >
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-stone-900/[0.07] bg-white/60 dark:border-white/[0.07] dark:bg-white/[0.04]">
                              <ModelProviderIcon className="size-[18px]" model={model} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[11px] font-semibold text-stone-800 dark:text-stone-200">{model.label}</span>
                              <span className="block truncate text-[9px] text-stone-500 dark:text-stone-600">{model.capability}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button aria-label={buttonText} className="group flex h-10 items-center gap-2 rounded-xl bg-stone-950 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400 dark:bg-white dark:text-stone-950 dark:hover:bg-cyan-300 dark:disabled:bg-stone-800 dark:disabled:text-stone-600 sm:px-4" disabled={!prompt.trim() || !selectedModel} type="submit">
                  <span className="hidden sm:inline">Start chatting</span>
                  <ArrowUp className="size-4 transition-transform group-hover:-translate-y-0.5" />
                </button>
              </div>
            </div>
          </div>
        </form>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[9px] font-medium uppercase tracking-[0.13em] text-stone-500 dark:text-stone-700 sm:text-[10px]">
          <span className="inline-flex items-center gap-1.5"><Zap className="size-3 text-sky-600 dark:text-cyan-300" />Affordable model access</span>
          <span className="inline-flex items-center gap-1.5"><ProviderIcon className="size-3.5" provider="deepseek" />Direct DeepSeek access</span>
          <span className="inline-flex items-center gap-1.5"><ProviderIcon className="size-3.5" provider="openrouter" />OpenRouter catalog</span>
        </div>
        <a className="mt-5 inline-flex items-center gap-1.5 text-[10px] font-medium text-stone-500 transition-colors hover:text-sky-700 dark:text-stone-600 dark:hover:text-cyan-300" href="#branching">
          <GitBranch className="size-3.5" />
          Need several opinions? Explore branching
        </a>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-b from-transparent to-[#f7f7f6] dark:to-[#070707]" />
    </section>
  );
}

export { HeroWave as AiInputHero };
