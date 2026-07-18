import { ArrowRight, ChevronDown, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import useUserStore from "@/UserStore";
import { API_BASE_URL } from "@/Utils/ApiConfig";
import { LANDING_DRAFT_STORAGE_KEY } from "@/Utils/LandingDraft";
import { HeroWave } from "@/components/ui/ai-input-hero";
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

const faqItems = [
  {
    question: "How much does Wisp cost?",
    answer:
      "Plus starts at $8 per month and Pro at $20 per month. Yearly billing applies the discount shown on the pricing page, and both plans include monthly model-usage credit.",
  },
  {
    question: "Does Wisp offer zero data retention?",
    answer:
      "Not currently. Wisp saves your sessions and message history so you can return to conversations and manage them later. Do not use Wisp as a zero-retention service.",
  },
  {
    question: "Is Wisp safe for sensitive information?",
    answer:
      "Use the same care you would with any hosted AI product. Never paste passwords, API keys, private credentials, regulated data, or information you are not allowed to share.",
  },
  {
    question: "Which AI models can I use?",
    answer:
      "The live model catalog is shown in the Models section above. Availability can change as providers and model access evolve, so that catalog is the source of truth.",
  },
  {
    question: "What is conversation branching?",
    answer:
      "Branching lets you take one point in a conversation in a new direction or compare how different models respond without losing the original thread.",
  },
];

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
  const location = useLocation();
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
    if (!location.hash) return;

    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(
        decodeURIComponent(location.hash.slice(1)),
      );
      if (!target) return;

      const navbarOffset = 20;
      window.scrollTo({
        behavior: "smooth",
        top: target.getBoundingClientRect().top + window.scrollY - navbarOffset,
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.hash]);

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
        destination={destination}
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
        <ModelWheel
          destination={destination}
          models={models}
          onSelect={selectModel}
          selectedModelId={selectedModelId}
        />

        <section
          className="relative overflow-hidden bg-white px-4 py-20 text-stone-950 transition-colors dark:bg-[#0b0b0b] dark:text-stone-100 sm:px-6 sm:py-28"
          id="faq"
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute -left-32 top-1/3 size-80 rounded-full bg-sky-400/[0.07] blur-[110px] dark:bg-cyan-300/[0.035]" />
            <div className="absolute -right-24 bottom-0 size-72 rounded-full bg-cyan-300/[0.08] blur-[120px] dark:bg-sky-400/[0.035]" />
          </div>

          <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-700 dark:text-cyan-300">
                Questions, answered
              </p>
              <h2 className="mt-4 max-w-md text-balance text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
                The details before you dive in.
              </h2>
              <p className="mt-5 max-w-md text-sm leading-6 text-stone-600 dark:text-stone-400 sm:text-base">
                Clear answers about plans, privacy, safety, models, and how Wisp works.
              </p>
              <Link
                className="group mt-7 inline-flex items-center gap-2 text-sm font-semibold text-stone-950 transition-colors hover:text-sky-700 dark:text-white dark:hover:text-cyan-300"
                to="/pricing"
              >
                Explore pricing
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            <div className="border-t border-stone-900/[0.1] dark:border-white/[0.09]">
              {faqItems.map((item, index) => (
                <details
                  className="group border-b border-stone-900/[0.1] dark:border-white/[0.09]"
                  key={item.question}
                  open={index === 0}
                >
                  <summary className="flex cursor-pointer list-none items-center gap-5 py-6 text-left marker:content-none sm:py-7 [&::-webkit-details-marker]:hidden">
                    <span className="text-[10px] font-bold tabular-nums tracking-[0.16em] text-sky-700 dark:text-cyan-300">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="flex-1 text-lg font-semibold tracking-[-0.025em] sm:text-xl">
                      {item.question}
                    </span>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-stone-900/[0.1] bg-stone-950/[0.025] transition-transform duration-300 group-open:rotate-180 dark:border-white/[0.1] dark:bg-white/[0.04]">
                      <ChevronDown className="size-4" />
                    </span>
                  </summary>
                  <p className="max-w-2xl pb-7 pl-10 pr-12 text-sm leading-7 text-stone-600 dark:text-stone-400 sm:pl-[3.25rem] sm:text-base">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

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
            <Link className="transition-colors hover:text-stone-950 dark:hover:text-stone-300" to="/pricing">
              Pricing
            </Link>
            <a className="transition-colors hover:text-stone-950 dark:hover:text-stone-300" href="#faq">
              FAQ
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
