"use client";

import { ArrowUpRight, Check, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import {
  ModelProviderIcon,
  ProviderIcon,
  type CatalogModel,
} from "@/components/ui/model-provider-icons";

type WheelStyle = CSSProperties & {
  "--wheel-angle": string;
};

export function ModelWheel({
  destination,
  models,
  onSelect,
  selectedModelId,
}: {
  destination: string;
  models: CatalogModel[];
  onSelect: (modelId: string) => void;
  selectedModelId: string;
}) {
  const [highlightedId, setHighlightedId] = useState(
    selectedModelId || models[0]?.id || "",
  );
  const [interacting, setInteracting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (selectedModelId) setHighlightedId(selectedModelId);
  }, [selectedModelId]);

  useEffect(() => {
    if (interacting || reducedMotion || models.length < 2) return;
    const interval = window.setInterval(() => {
      setHighlightedId((current) => {
        const currentIndex = models.findIndex((model) => model.id === current);
        return models[(currentIndex + 1 + models.length) % models.length]?.id ?? current;
      });
    }, 2_200);
    return () => window.clearInterval(interval);
  }, [interacting, models, reducedMotion]);

  const highlightedModel = useMemo(
    () =>
      models.find((model) => model.id === highlightedId) ??
      models.find((model) => model.id === selectedModelId) ??
      models[0],
    [highlightedId, models, selectedModelId],
  );

  if (!highlightedModel) return null;

  return (
    <section
      className="relative overflow-hidden border-y border-stone-200 bg-[#f7f7f6] px-4 py-24 text-stone-950 transition-colors dark:border-white/[0.06] dark:bg-[#070707] dark:text-stone-50 sm:px-6 sm:py-32"
      id="models"
    >
      <div className="pointer-events-none absolute left-1/2 top-[58%] size-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-400/[0.055] blur-[150px] dark:bg-sky-400/[0.03]" />
      <div className="relative mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-700 dark:text-cyan-300">
            Available on Wisp
          </p>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.045em] sm:text-5xl">
            Your model. Your choice.
          </h2>
          <p className="mt-4 text-sm leading-6 text-stone-600 dark:text-stone-400 sm:text-base">
            Pick the intelligence that fits the task. No automatic routing and no separate subscription stack.
          </p>
        </div>

        <div
          className={`wisp-model-wheel relative mx-auto mt-10 aspect-square w-full max-w-[680px] sm:mt-14 ${interacting ? "is-interacting" : ""}`}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false);
          }}
          onFocus={() => setInteracting(true)}
          onMouseEnter={() => setInteracting(true)}
          onMouseLeave={() => setInteracting(false)}
        >
          <div className="wisp-wheel-orbit-layer absolute inset-0 z-10">
          <svg aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" fill="none" viewBox="0 0 680 680">
            <defs>
              <linearGradient id="wheel-orbit" x1="80" x2="600" y1="80" y2="600">
                <stop stopColor="#0284c7" stopOpacity="0" />
                <stop offset="0.5" stopColor="#22d3ee" stopOpacity="0.5" />
                <stop offset="1" stopColor="#fb7185" stopOpacity="0" />
              </linearGradient>
            </defs>
            <circle className="wisp-wheel-ring" cx="340" cy="340" r="286" stroke="url(#wheel-orbit)" strokeDasharray="3 13" />
            <circle cx="340" cy="340" r="223" stroke="currentColor" strokeDasharray="1 15" strokeOpacity="0.09" />
            <circle cx="340" cy="340" fill="currentColor" fillOpacity="0.018" r="174" />
            <circle cx="340" cy="54" fill="#22d3ee" r="3.5">
              <animate attributeName="opacity" dur="2.4s" repeatCount="indefinite" values="0.25;1;0.25" />
            </circle>
            <circle cx="340" cy="626" fill="#fb7185" r="2.5">
              <animate attributeName="opacity" begin="-1.2s" dur="2.4s" repeatCount="indefinite" values="0.2;0.9;0.2" />
            </circle>
          </svg>

          {models.map((model, index) => {
            const highlighted = model.id === highlightedModel.id;
            const selected = model.id === selectedModelId;
            const style: WheelStyle = {
              "--wheel-angle": `${(360 / models.length) * index}deg`,
            };

            return (
              <button
                aria-label={`Select ${model.label}`}
                aria-pressed={selected}
                className={`wisp-wheel-model group absolute left-1/2 top-1/2 z-10 w-12 text-center sm:w-24 ${highlighted ? "is-highlighted" : ""}`}
                key={model.id}
                onClick={() => {
                  onSelect(model.id);
                  setHighlightedId(model.id);
                }}
                onFocus={() => setHighlightedId(model.id)}
                onMouseEnter={() => setHighlightedId(model.id)}
                style={style}
                type="button"
              >
                <span className="wisp-wheel-model-face flex w-full flex-col items-center gap-1.5">
                <span
                  className={`relative flex size-10 items-center justify-center rounded-xl border shadow-sm transition-all duration-300 sm:size-12 sm:rounded-2xl ${
                    highlighted
                      ? "scale-110 border-sky-500/50 bg-white shadow-[0_12px_40px_rgba(14,165,233,0.16)] dark:bg-stone-900"
                      : "border-stone-300/80 bg-white group-hover:border-sky-500/35 dark:border-white/[0.09] dark:bg-[#121212]"
                  }`}
                >
                  <ModelProviderIcon className="size-5 sm:size-6" model={model} />
                  {selected && (
                    <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-cyan-400 text-stone-950 ring-2 ring-[#f7f7f6] dark:ring-[#070707]">
                      <Check className="size-2.5" strokeWidth={3} />
                    </span>
                  )}
                </span>
                <span className="hidden max-w-24 truncate text-[9px] font-semibold text-stone-600 dark:text-stone-400 sm:block">
                  {model.label}
                </span>
                </span>
              </button>
            );
          })}
          </div>

          <div className="absolute left-1/2 top-1/2 z-20 flex size-[46%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-stone-300/80 bg-white/95 p-4 text-center shadow-[0_30px_100px_rgba(24,24,27,0.08)] backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#0e0e0e]/95 dark:shadow-[0_30px_100px_rgba(0,0,0,0.45)] sm:size-[43%] sm:p-8">
            <span className="flex size-10 items-center justify-center rounded-2xl border border-stone-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.04] sm:size-14">
              <ModelProviderIcon className="size-6 sm:size-8" model={highlightedModel} />
            </span>
            <p className="mt-3 max-w-40 text-balance text-sm font-semibold tracking-[-0.02em] sm:mt-4 sm:text-xl">
              {highlightedModel.label}
            </p>
            <p className="mt-1 hidden text-[10px] text-stone-500 dark:text-stone-500 sm:block">
              {highlightedModel.capability}
            </p>
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-400 sm:mt-3">
              <span className="size-1.5 rounded-full bg-current" />
              Available now
            </span>
            <div className="mt-2 hidden items-center gap-1 text-[9px] text-stone-500 dark:text-stone-600 sm:flex">
              <ProviderIcon className="size-3" provider={highlightedModel.provider} />
              {highlightedModel.provider === "deepseek" ? "DeepSeek" : "OpenRouter"}
            </div>
          </div>
        </div>

        <div className="mx-auto mt-6 flex max-w-xl flex-col items-center text-center sm:-mt-5">
          <p className="text-[10px] text-stone-500 dark:text-stone-600">
            {models.length} selectable models · catalog loaded directly from Wisp
          </p>
          <Link
            className="group mt-5 inline-flex items-center gap-2 rounded-xl bg-stone-950 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-sky-600 dark:bg-stone-50 dark:text-stone-950 dark:hover:bg-cyan-300"
            onClick={() => onSelect(highlightedModel.id)}
            to={destination}
          >
            <Sparkles className="size-3.5" />
            Chat with {highlightedModel.label}
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
