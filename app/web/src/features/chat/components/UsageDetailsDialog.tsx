import { useQuery } from "@tanstack/react-query";
import { BarChart3, RefreshCw, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchUsageSummary, usageQueryKeys } from "../chatApi";
import type { UsageMetric, UsageRange } from "../chatTypes";
import { useChatClientStore } from "../state/chatClientStore";

const RANGE_OPTIONS: Array<{ label: string; value: UsageRange }> = [
  { label: "Last 5 hours", value: "5h" },
  { label: "Last 24 hours", value: "24h" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 3 months", value: "90d" },
];

const EMPTY_USAGE: UsageMetric = {
  cachedInputTokens: 0,
  inputTokens: 0,
  outputTokens: 0,
  requests: 0,
  totalTokens: 0,
};

const formatUsageNumber = (value: number) =>
  new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
    notation: Math.abs(value) >= 10_000 ? "compact" : "standard",
  }).format(value);

const formatBucket = (value: string, bucket: "day" | "hour") => {
  const date = bucket === "day" ? new Date(`${value}T12:00:00Z`) : new Date(value);
  return new Intl.DateTimeFormat(undefined, {
    ...(bucket === "hour"
      ? { hour: "numeric", minute: "2-digit" }
      : { day: "numeric", month: "short" }),
  }).format(date);
};

export const UsageDetailsDialog = ({ onClose }: { onClose: () => void }) => {
  const [range, setRange] = useState<UsageRange>("30d");
  const [modelFilter, setModelFilter] = useState("all");
  const theme = useChatClientStore((state) => state.theme);
  const usageQuery = useQuery({
    queryKey: usageQueryKeys.summary(range),
    queryFn: ({ signal }) => fetchUsageSummary({ range, signal }),
    refetchInterval: 30_000,
  });
  const usage = usageQuery.data;
  const modelNames = useMemo(
    () => usage?.models.map((model) => model.model) ?? [],
    [usage?.models],
  );
  const effectiveModelFilter =
    modelFilter === "all" || modelNames.includes(modelFilter)
      ? modelFilter
      : "all";
  const selectedModel =
    effectiveModelFilter === "all"
      ? null
      : usage?.models.find((model) => model.model === effectiveModelFilter);
  const selectedTotals = selectedModel ?? usage?.totals ?? EMPTY_USAGE;
  const averageTokens = selectedTotals.requests
    ? selectedTotals.totalTokens / selectedTotals.requests
    : 0;
  const chartData = useMemo(() => {
    if (!usage) return [];
    if (effectiveModelFilter === "all") return usage.daily;

    const totalsByBucket = new Map(
      usage.dailyByModel
        .filter((row) => row.model === effectiveModelFilter)
        .map((row) => [row.date, row]),
    );
    return usage.daily.map((bucket) => ({
      ...bucket,
      ...(totalsByBucket.get(bucket.date) ?? EMPTY_USAGE),
    }));
  }, [effectiveModelFilter, usage]);

  useEffect(() => {
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-2 sm:p-6">
      <button
        aria-label="Close detailed usage"
        className="absolute inset-0 bg-zinc-950/55 backdrop-blur-[3px] dark:bg-black/80"
        onClick={onClose}
        type="button"
      />
      <section
        aria-labelledby="usage-details-title"
        aria-modal="true"
        className="relative z-10 flex max-h-[calc(100dvh-1rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white text-zinc-950 shadow-[0_28px_100px_rgba(0,0,0,0.35)] dark:border-zinc-700 dark:bg-[#111113] dark:text-zinc-100 sm:max-h-[min(760px,calc(100dvh-3rem))] sm:rounded-[24px]"
        role="dialog"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-200 px-4 py-4 dark:border-zinc-800 sm:px-6 sm:py-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                <BarChart3 className="size-4" />
              </span>
              <h2 className="text-base font-semibold" id="usage-details-title">
                Usage details
              </h2>
            </div>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 sm:ml-10">
              API calls and token usage for completed model responses.
            </p>
          </div>
          <button
            aria-label="Close detailed usage"
            className="flex size-9 shrink-0 items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="subtle-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold">Usage breakdown</h3>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {effectiveModelFilter === "all"
                  ? "All models"
                  : effectiveModelFilter}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <label className="sr-only" htmlFor="usage-range-filter">
                Usage time range
              </label>
              <select
                className="h-10 min-w-0 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-800 outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:border-cyan-500"
                id="usage-range-filter"
                onChange={(event) =>
                  setRange(event.target.value as UsageRange)
                }
                value={range}
              >
                {RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <label className="sr-only" htmlFor="usage-model-filter">
                Usage model
              </label>
              <select
                className="h-10 min-w-0 max-w-64 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-800 outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:border-cyan-500"
                id="usage-model-filter"
                onChange={(event) => setModelFilter(event.target.value)}
                value={effectiveModelFilter}
              >
                <option value="all">All models</option>
                {modelNames.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
              <button
                aria-label="Refresh usage"
                className="hidden size-10 items-center justify-center rounded-xl border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-900 disabled:cursor-wait dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white sm:flex"
                disabled={usageQuery.isFetching}
                onClick={() => void usageQuery.refetch()}
                type="button"
              >
                <RefreshCw
                  className={`size-4 ${usageQuery.isFetching ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </div>

          {usageQuery.isLoading ? (
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[0, 1, 2, 3].map((item) => (
                  <div
                    className="h-24 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800"
                    key={item}
                  />
                ))}
              </div>
              <div className="h-80 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
            </div>
          ) : usageQuery.error ? (
            <div className="mt-5 flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 px-6 text-center dark:border-zinc-700">
              <p className="text-sm font-medium">Usage could not be loaded</p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {usageQuery.error.message}
              </p>
              <button
                className="mt-4 rounded-xl bg-zinc-950 px-4 py-2 text-xs font-semibold text-white dark:bg-white dark:text-zinc-950"
                onClick={() => void usageQuery.refetch()}
                type="button"
              >
                Try again
              </button>
            </div>
          ) : usage ? (
            <>
              <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  { label: "API calls", value: selectedTotals.requests },
                  { label: "Total tokens", value: selectedTotals.totalTokens },
                  { label: "Input tokens", value: selectedTotals.inputTokens },
                  { label: "Output tokens", value: selectedTotals.outputTokens },
                ].map((metric) => (
                  <article
                    className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/65"
                    key={metric.label}
                  >
                    <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                      {metric.label}
                    </p>
                    <p
                      className="mt-2 text-2xl font-semibold tracking-tight tabular-nums"
                      title={metric.value.toLocaleString()}
                    >
                      {formatUsageNumber(metric.value)}
                    </p>
                  </article>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                  <div>
                    <h4 className="text-xs font-semibold">Token usage</h4>
                    <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                      {formatUsageNumber(selectedTotals.cachedInputTokens)} cached
                      input · {formatUsageNumber(averageTokens)} tokens per call
                    </p>
                  </div>
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {RANGE_OPTIONS.find((option) => option.value === range)
                      ?.label ?? range}
                  </span>
                </div>
                {selectedTotals.requests ? (
                  <div
                    aria-label="Token usage chart"
                    className="mt-5 h-64 w-full sm:h-72"
                    role="img"
                  >
                    <ResponsiveContainer height="100%" width="100%">
                      <BarChart
                        data={chartData}
                        margin={{ bottom: 0, left: -14, right: 8, top: 8 }}
                      >
                        <CartesianGrid
                          opacity={0.18}
                          stroke="#a1a1aa"
                          strokeDasharray="4 6"
                          vertical={false}
                        />
                        <XAxis
                          axisLine={false}
                          dataKey="date"
                          minTickGap={24}
                          tick={{ fill: "#71717a", fontSize: 10 }}
                          tickFormatter={(value: string) =>
                            formatBucket(value, usage.period.bucket)
                          }
                          tickLine={false}
                        />
                        <YAxis
                          axisLine={false}
                          tick={{ fill: "#71717a", fontSize: 10 }}
                          tickFormatter={(value: number) =>
                            formatUsageNumber(value)
                          }
                          tickLine={false}
                          width={52}
                        />
                        <Tooltip
                          contentStyle={{
                            background: theme === "dark" ? "#18181b" : "#fff",
                            border: `1px solid ${theme === "dark" ? "#3f3f46" : "#e4e4e7"}`,
                            borderRadius: "12px",
                            boxShadow: "0 16px 40px -24px rgba(0,0,0,.5)",
                            color: theme === "dark" ? "#f4f4f5" : "#18181b",
                            fontSize: "12px",
                          }}
                          cursor={{ fill: theme === "dark" ? "#27272a" : "#f4f4f5" }}
                          formatter={(value) => [
                            `${Number(value).toLocaleString()} tokens`,
                            "Usage",
                          ]}
                          labelFormatter={(value) =>
                            formatBucket(String(value), usage.period.bucket)
                          }
                        />
                        <Bar
                          dataKey="totalTokens"
                          fill={theme === "dark" ? "#22d3ee" : "#0ea5e9"}
                          maxBarSize={38}
                          minPointSize={2}
                          radius={[5, 5, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex h-64 flex-col items-center justify-center text-center sm:h-72">
                    <span className="flex size-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
                      <BarChart3 className="size-5" />
                    </span>
                    <p className="mt-3 text-sm font-medium">
                      No usage in this range
                    </p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      Try a longer period or choose another model.
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
};

export default UsageDetailsDialog;
