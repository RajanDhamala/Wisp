"use client";

import {
  ArrowUp,
  Check,
  Copy,
  Ellipsis,
  Folder,
  GitBranch,
  Library,
  Maximize2,
  Plus,
  Search,
  Share2,
  Sparkles,
  SquarePen,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import {
  MODEL_IDENTITIES,
  ModelProviderIcon,
  WispMark,
  type ModelIdentity,
} from "@/components/ui/model-provider-icons";

const responses: Array<{
  model: ModelIdentity;
  latency: string;
  content: React.ReactNode;
}> = [
  {
    model: MODEL_IDENTITIES.deepseek,
    latency: "1.8s",
    content: (
      <>
        <p className="font-medium text-zinc-100">Recommended architecture</p>
        <p className="mt-2">
          Use a shared request coordinator, then stream every provider independently into a normalized branch.
        </p>
        <div className="mt-4 rounded-lg border border-white/[0.07] bg-black/40 p-3 font-mono text-[10px] leading-5 text-zinc-400">
          <p><span className="text-violet-400">const</span> results = await</p>
          <p className="pl-3 text-cyan-300">streamModels(selected)</p>
        </div>
      </>
    ),
  },
  {
    model: MODEL_IDENTITIES.qwen,
    latency: "2.1s",
    content: (
      <>
        <p className="font-medium text-zinc-100">Build it in three layers</p>
        <ol className="mt-3 space-y-2.5">
          <li><span className="mr-2 text-violet-400">01</span>Request orchestration</li>
          <li><span className="mr-2 text-violet-400">02</span>Provider adapters</li>
          <li><span className="mr-2 text-violet-400">03</span>Live comparison UI</li>
        </ol>
        <p className="mt-4 text-zinc-500">This keeps provider failures isolated.</p>
      </>
    ),
  },
  {
    model: MODEL_IDENTITIES.kimi,
    latency: "2.4s",
    content: (
      <>
        <p className="font-medium text-zinc-100">A practical V1</p>
        <p className="mt-2">
          Fan out one prompt, preserve shared context, and let users continue from the strongest response.
        </p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {['Parallel SSE', 'Shared context', 'Usage totals'].map((item) => (
            <span className="rounded-md border border-white/[0.07] bg-white/[0.04] px-2 py-1 text-[10px] text-zinc-400" key={item}>
              {item}
            </span>
          ))}
        </div>
      </>
    ),
  },
];

const toolbarIconClass = "size-3.5 text-zinc-500";

export function ChatSessionShowcase() {
  return (
    <div className="relative mx-auto w-full max-w-[1240px]">
      <div className="wisp-preview-glow pointer-events-none absolute -inset-16 -z-10 rounded-[80px] bg-violet-600/[0.12] blur-[90px]" />

      <div className="overflow-hidden rounded-2xl border border-white/[0.12] bg-[#080809] shadow-[0_50px_150px_-45px_rgba(0,0,0,0.95),0_30px_90px_-55px_rgba(124,58,237,0.8)] sm:rounded-[28px]">
        <div className="flex h-11 items-center justify-between border-b border-white/[0.07] bg-white/[0.025] px-4">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-[#ff5f57]" />
            <span className="size-2.5 rounded-full bg-[#febc2e]" />
            <span className="size-2.5 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex items-center gap-2 rounded-md border border-white/[0.06] bg-black/30 px-3 py-1 text-[9px] text-zinc-600 sm:text-[10px]">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            app.wisp.ai/session/product-architecture
          </div>
          <Ellipsis className="size-4 text-zinc-600" />
        </div>

        <div className="flex h-[590px] min-h-0 sm:h-[650px] lg:h-[690px]">
          <aside className="hidden w-[196px] shrink-0 flex-col border-r border-white/[0.07] bg-[#0c0c0e] p-3 md:flex lg:w-[220px]">
            <div className="flex h-10 items-center gap-2 px-2 text-xs font-semibold text-white">
              <span className="flex size-7 items-center justify-center rounded-lg bg-white text-zinc-950">
                <WispMark className="size-5" />
              </span>
              Wisp
            </div>
            <div className="mt-3 space-y-1">
              {[
                [SquarePen, "New chat"],
                [Search, "Search chats"],
                [Library, "Library"],
              ].map(([Icon, label]) => {
                const SidebarIcon = Icon as typeof SquarePen;
                return (
                  <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[11px] text-zinc-400" key={label as string}>
                    <SidebarIcon className="size-3.5" />
                    {label as string}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 border-t border-white/[0.06] pt-4">
              <div className="flex items-center justify-between px-2 text-[9px] font-medium uppercase tracking-[0.15em] text-zinc-700">
                <span>Projects</span><Plus className="size-3" />
              </div>
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-white/[0.06] px-2.5 py-2 text-[11px] text-zinc-300">
                <Folder className="size-3.5" />
                Wisp product
              </div>
            </div>
            <div className="mt-5 px-2 text-[9px] font-medium uppercase tracking-[0.15em] text-zinc-700">Today</div>
            <div className="mt-2 space-y-1 text-[11px] text-zinc-500">
              <div className="rounded-lg bg-violet-400/[0.08] px-2.5 py-2 text-violet-100">Multi-model architecture</div>
              <div className="truncate px-2.5 py-2">Landing page directions</div>
              <div className="truncate px-2.5 py-2">Pricing copy review</div>
            </div>
            <div className="mt-auto flex items-center gap-2 border-t border-white/[0.06] px-2 pt-3">
              <span className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-cyan-400 text-[9px] font-bold text-zinc-950">RD</span>
              <div>
                <p className="text-[10px] font-medium text-zinc-300">Ranjan</p>
                <p className="text-[9px] text-zinc-600">Pro workspace</p>
              </div>
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col bg-black">
            <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.04] px-3 sm:px-5">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-white/[0.05] md:hidden">
                  <WispMark className="size-4 text-white" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-zinc-300">Multi-model architecture</p>
                  <p className="text-[9px] text-zinc-600">3 model branches</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden items-center gap-1.5 rounded-full border border-emerald-400/10 bg-emerald-400/[0.06] px-2.5 py-1 text-[9px] text-emerald-300 sm:flex">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  Generation complete
                </span>
                <Share2 className={toolbarIconClass} />
                <Ellipsis className={toolbarIconClass} />
              </div>
            </header>

            <div className="min-h-0 flex-1 px-3 py-5 sm:px-5 lg:px-7">
              <div className="mx-auto flex h-full max-w-[900px] flex-col">
                <div className="flex justify-end">
                  <div className="max-w-[88%] rounded-2xl rounded-tr-md border border-white/[0.06] bg-white/[0.07] px-3.5 py-2.5 text-[11px] leading-5 text-zinc-300 sm:max-w-xl sm:text-xs">
                    How would you structure a multi-model AI workspace that streams three responses live and keeps provider costs easy to compare?
                  </div>
                </div>

                <div className="mt-5 flex min-h-0 flex-1 gap-2.5 overflow-x-auto pb-2 [scrollbar-width:none] sm:gap-3">
                  {responses.map(({ model, latency, content }) => (
                    <article className="group flex h-full w-[82vw] max-w-[310px] shrink-0 flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#0d0d0f] shadow-lg sm:w-[280px] lg:min-w-0 lg:flex-1" key={model.id}>
                      <div className="flex items-center justify-between border-b border-white/[0.07] px-3 py-2.5">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.04]">
                            <ModelProviderIcon className="size-4" model={model} />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-[10px] font-semibold text-zinc-200">{model.label}</p>
                            <p className="text-[8px] text-zinc-600">{model.category}</p>
                          </div>
                        </div>
                        <Maximize2 className="size-3 text-zinc-700 transition-colors group-hover:text-zinc-400" />
                      </div>
                      <div className="min-h-0 flex-1 overflow-hidden px-3.5 py-4 text-[11px] leading-5 text-zinc-400 sm:px-4">
                        {content}
                      </div>
                      <div className="flex items-center justify-between border-t border-white/[0.05] px-3 py-2">
                        <div className="flex items-center gap-2 text-zinc-700">
                          <Copy className="size-3" />
                          <ThumbsUp className="size-3" />
                          <ThumbsDown className="size-3" />
                        </div>
                        <span className="flex items-center gap-1 text-[8px] text-emerald-400/70"><Check className="size-2.5" />{latency}</span>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="mt-3 rounded-[18px] border border-white/[0.09] bg-[#111114] p-2 shadow-[0_12px_50px_rgba(0,0,0,0.5)]">
                  <p className="px-2 py-1.5 text-[11px] text-zinc-600">Ask all selected models...</p>
                  <div className="mt-1 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="flex size-7 items-center justify-center rounded-full bg-white text-zinc-950"><GitBranch className="size-3.5" /></span>
                      <Plus className="size-3.5 text-zinc-600" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="hidden items-center -space-x-1 sm:flex">
                        {responses.map(({ model }) => (
                          <span className="flex size-6 items-center justify-center rounded-full border-2 border-[#111114] bg-zinc-800" key={model.id}>
                            <ModelProviderIcon className="size-3.5" model={model} />
                          </span>
                        ))}
                      </div>
                      <span className="text-[9px] text-zinc-500">3 selected</span>
                      <span className="flex size-7 items-center justify-center rounded-full bg-white text-zinc-950"><ArrowUp className="size-3.5" /></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="wisp-float-slow absolute -left-3 top-20 hidden items-center gap-2 rounded-full border border-white/10 bg-[#111114]/95 px-3 py-2 text-[10px] text-zinc-300 shadow-2xl backdrop-blur-xl lg:flex">
        <Sparkles className="size-3.5 text-violet-300" />
        One prompt · 3 perspectives
      </div>
      <div className="wisp-float-slower absolute -right-3 bottom-24 hidden items-center gap-2 rounded-full border border-white/10 bg-[#111114]/95 px-3 py-2 text-[10px] text-zinc-300 shadow-2xl backdrop-blur-xl lg:flex">
        <span className="size-1.5 rounded-full bg-emerald-400" />
        $0.018 total
      </div>
    </div>
  );
}
