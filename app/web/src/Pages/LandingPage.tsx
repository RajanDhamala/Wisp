import { ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import useUserStore from "@/UserStore";
import { API_BASE_URL } from "@/Utils/ApiConfig";
import { LANDING_DRAFT_STORAGE_KEY } from "@/Utils/LandingDraft";
import { HeroWave } from "@/components/ui/ai-input-hero";
import { ChatSessionShowcase } from "@/components/ui/chat-session-showcase";
import {
  LANDING_MODELS,
  WispMark,
  type ModelCatalogResponse,
} from "@/components/ui/model-provider-icons";
import { ModelWheel } from "@/components/ui/model-wheel";

type ApiEnvelope<T> = {
  data: T;
  message?: string;
};

const fetchPublicModelCatalog = async (): Promise<ModelCatalogResponse> => {
  const response = await fetch(`${API_BASE_URL}/session/models`, {
    headers: { Accept: "application/json" },
  });
  const body = (await response.json().catch(() => null)) as
    | ApiEnvelope<ModelCatalogResponse>
    | null;

  if (!response.ok || !body?.data?.models?.length) {
    throw new Error(body?.message || "Could not load the Wisp model catalog");
  }
  return body.data;
};

const LandingPage = () => {
  const navigate = useNavigate();
  const currentUser = useUserStore((state) => state.currentUser);
  const destination = currentUser ? "/session" : "/login";
  const [selectedModelId, setSelectedModelId] = useState(() =>
    typeof window === "undefined"
      ? ""
      : (window.localStorage.getItem("wisp-selected-model") ?? ""),
  );
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    const savedTheme = window.localStorage.getItem("wisp-theme");
    if (savedTheme === "dark" || savedTheme === "light") return savedTheme;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });
  const catalogQuery = useQuery<ModelCatalogResponse, Error>({
    queryKey: ["public-model-catalog"],
    queryFn: fetchPublicModelCatalog,
    retry: 1,
    staleTime: 10 * 60 * 1000,
  });
  const models = catalogQuery.data?.models ?? LANDING_MODELS;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("wisp-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!selectedModelId) return;
    if (models.some((model) => model.id === selectedModelId)) return;
    setSelectedModelId("");
    window.localStorage.removeItem("wisp-selected-model");
  }, [models, selectedModelId]);

  const selectModel = (modelId: string) => {
    setSelectedModelId(modelId);
    window.localStorage.setItem("wisp-selected-model", modelId);
  };

  const startFromPrompt = (prompt: string, modelId: string) => {
    selectModel(modelId);
    window.localStorage.setItem(LANDING_DRAFT_STORAGE_KEY, prompt);
    window.localStorage.setItem("wisp-chat-mode", "normal");
    navigate(destination);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f7f6] font-sans text-stone-950 selection:bg-sky-400/25 dark:bg-[#070707] dark:text-stone-100">
      <HeroWave
        models={models}
        onModelSelect={selectModel}
        onPromptSubmit={startFromPrompt}
        onThemeToggle={() =>
          setTheme((current) => (current === "dark" ? "light" : "dark"))
        }
        selectedModelId={selectedModelId}
        theme={theme}
      />

      <main>
        <section
          className="relative overflow-hidden bg-[#f7f7f6] px-3 py-24 transition-colors dark:bg-[#070707] sm:px-6 sm:py-32"
          id="branching"
        >
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[42rem] w-[62rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-400/[0.045] blur-[150px] dark:bg-sky-400/[0.025]" />
          <div className="relative mx-auto max-w-7xl">
            <div className="mx-auto mb-14 max-w-2xl text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-700 dark:text-cyan-300">
                Optional branching
              </p>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.045em] text-stone-950 dark:text-white sm:text-5xl">
                Need more than one answer? Branch it.
              </h2>
              <p className="mt-4 text-sm leading-6 text-stone-600 dark:text-stone-500 sm:text-base sm:leading-7">
                Choose the models. Send once. Compare every response live.
              </p>
            </div>
            <ChatSessionShowcase />
          </div>
        </section>

        <ModelWheel
          destination={destination}
          models={models}
          onSelect={selectModel}
          selectedModelId={selectedModelId}
        />

        <section className="bg-[#f7f7f6] px-4 py-16 transition-colors dark:bg-[#070707] sm:px-6 sm:py-20">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 border-t border-stone-900/[0.08] pt-14 dark:border-white/[0.07] sm:flex-row sm:items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-700 dark:text-cyan-300">
                Ready when you are
              </p>
              <h2 className="mt-3 max-w-2xl text-balance text-3xl font-semibold tracking-[-0.045em] sm:text-5xl">
                Choose a model. Start talking.
              </h2>
            </div>
            <Link
              className="group inline-flex shrink-0 items-center gap-2 rounded-xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-600 dark:bg-white dark:text-stone-950 dark:hover:bg-cyan-300"
              to={destination}
            >
              <Sparkles className="size-4" />
              Start chatting
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-[#f7f7f6] px-4 pb-8 transition-colors dark:bg-[#070707] sm:px-6 sm:pb-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 border-t border-stone-900/[0.07] pt-8 text-[10px] text-stone-500 dark:border-white/[0.06] dark:text-stone-700 sm:flex-row sm:items-center sm:justify-between">
          <Link
            className="flex items-center gap-2 font-semibold text-stone-700 dark:text-stone-400"
            to="/"
          >
            <span className="flex size-7 items-center justify-center rounded-lg bg-stone-950 text-white dark:bg-white dark:text-stone-950">
              <WispMark className="size-5" />
            </span>
            Wisp
          </Link>
          <p>Model access, simplified.</p>
          <div className="flex items-center gap-5">
            <a className="transition-colors hover:text-stone-950 dark:hover:text-stone-300" href="#branching">
              Branching
            </a>
            <a className="transition-colors hover:text-stone-950 dark:hover:text-stone-300" href="#models">
              Models
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
