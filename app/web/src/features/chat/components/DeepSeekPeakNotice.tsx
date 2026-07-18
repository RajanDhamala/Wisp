import { Clock3, X } from "lucide-react";
import { memo, useEffect, useMemo, useState } from "react";
import type { ChatMode, ModelOption } from "../chatTypes";
import { getDeepSeekPeakStatus } from "../deepSeekPeakTime";

type DeepSeekPeakNoticeProps = {
  branchModels: string[];
  chatMode: ChatMode;
  fallbackModel: string;
  models: ModelOption[];
  selectedModel: string;
};

const DeepSeekPeakNoticeComponent = ({
  branchModels,
  chatMode,
  fallbackModel,
  models,
  selectedModel,
}: DeepSeekPeakNoticeProps) => {
  const [dismissed, setDismissed] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const usesDirectDeepSeek = useMemo(() => {
    const activeModelIds =
      chatMode === "branching"
        ? branchModels
        : [selectedModel || fallbackModel];
    const activeModels = new Set(activeModelIds);
    return models.some(
      (model) =>
        activeModels.has(model.id) && model.provider === "deepseek",
    );
  }, [branchModels, chatMode, fallbackModel, models, selectedModel]);
  const peakStatus = useMemo(() => getDeepSeekPeakStatus(now), [now]);

  useEffect(() => {
    let interval: number | undefined;
    const update = () => setNow(new Date());
    const delayUntilNextMinute = 60_000 - (Date.now() % 60_000);
    const timeout = window.setTimeout(() => {
      update();
      interval = window.setInterval(update, 60_000);
    }, delayUntilNextMinute);
    document.addEventListener("visibilitychange", update);

    return () => {
      window.clearTimeout(timeout);
      if (interval !== undefined) window.clearInterval(interval);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  if (dismissed || !usesDirectDeepSeek || !peakStatus.isPeak)
    return null;

  return (
    <div
      aria-live="polite"
      className="mb-2 flex items-start gap-3 rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-zinc-900 shadow-sm ring-1 ring-black/[0.02] dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:ring-white/[0.04]"
      role="status"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
        <Clock3 className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold">DeepSeek peak pricing is active</p>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
            2× token cost
          </span>
        </div>
        <p className="mt-1 text-[11px] leading-4 text-zinc-600 dark:text-zinc-300">
          Peak pricing ends at {peakStatus.nepalEndTime}. Nepal time now:{" "}
          {peakStatus.nepalTime}.
        </p>
        <p className="mt-0.5 text-[10px] leading-4 text-zinc-500 dark:text-zinc-500">
          Daily Nepal windows: 6:45–9:45 AM and 11:45 AM–3:45 PM (NPT)
        </p>
      </div>
      <button
        aria-label="Dismiss DeepSeek peak pricing notice"
        className="flex size-7 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        onClick={() => setDismissed(true)}
        type="button"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
};

export const DeepSeekPeakNotice = memo(DeepSeekPeakNoticeComponent);
