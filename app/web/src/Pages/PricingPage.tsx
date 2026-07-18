import {
  ArrowRight,
  Check,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useUserStore from "@/UserStore";
import { Navbar } from "@/components/ui/mini-navbar";
import { WispMark } from "@/components/ui/model-provider-icons";

type BillingCycle = "monthly" | "yearly";

type PricingPlan = {
  name: "Plus" | "Pro";
  description: string;
  monthlyPrice: string;
  yearlyMonthlyPrice: string;
  yearlyTotal: string;
  includedCredit: string;
  creditLabel: string;
  features: string[];
  featured?: boolean;
};

const plans: PricingPlan[] = [
  {
    name: "Plus",
    description: "Everything you need to chat across the best models without juggling subscriptions.",
    monthlyPrice: "8",
    yearlyMonthlyPrice: "7.60",
    yearlyTotal: "91.20",
    includedCredit: "$15",
    creditLabel: "equivalent model usage included",
    features: [
      "Open-source and frontier models",
      "Branch one prompt across multiple models",
      "Parallel model calls and live responses",
      "Projects and conversation history",
      "Transparent per-model usage",
    ],
  },
  {
    name: "Pro",
    description: "More included frontier usage and room for heavier, everyday model workflows.",
    monthlyPrice: "20",
    yearlyMonthlyPrice: "19",
    yearlyTotal: "228",
    includedCredit: "$25",
    creditLabel: "frontier-model usage included",
    featured: true,
    features: [
      "Everything included in Plus",
      "Higher limits for model conversations",
      "Larger multi-model branching sessions",
      "Priority access when demand is high",
      "Early access to new Wisp models",
    ],
  },
];

const getInitialTheme = (): "dark" | "light" => {
  if (typeof window === "undefined") return "dark";
  const savedTheme = window.localStorage.getItem("wisp-theme");
  if (savedTheme === "dark" || savedTheme === "light") return savedTheme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const PricingPage = () => {
  const currentUser = useUserStore((state) => state.currentUser);
  const destination = currentUser ? "/session" : "/login";
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [theme, setTheme] = useState<"dark" | "light">(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("wisp-theme", theme);
  }, [theme]);

  return (
    <div className={`${theme === "dark" ? "dark" : ""} relative isolate min-h-screen overflow-x-hidden bg-background font-sans text-foreground selection:bg-sky-400/25`}>
      <Navbar
        onThemeToggle={() =>
          setTheme((current) => (current === "dark" ? "light" : "dark"))
        }
        theme={theme}
      />

      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[38rem] overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(24,24,27,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(24,24,27,0.04)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent)] dark:bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)]" />
        <div className="absolute left-1/2 top-0 h-[34rem] w-[68rem] -translate-x-1/2 bg-[radial-gradient(ellipse,rgba(14,165,233,0.08),transparent_64%)] dark:bg-[radial-gradient(ellipse,rgba(34,211,238,0.045),transparent_64%)]" />
      </div>

      <main className="px-4 pb-12 pt-28 sm:px-6 sm:pb-16 sm:pt-32">
        <h1 className="sr-only">Wisp pricing</h1>
        <div className="mx-auto mb-6 flex max-w-5xl justify-center sm:mb-8 sm:justify-end">
          <div
            aria-label="Billing cycle"
            className="inline-flex rounded-2xl border border-border bg-card/80 p-1 shadow-sm backdrop-blur-xl"
            role="group"
          >
            <button
              aria-pressed={billingCycle === "monthly"}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${billingCycle === "monthly" ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setBillingCycle("monthly")}
              type="button"
            >
              Monthly
            </button>
            <button
              aria-pressed={billingCycle === "yearly"}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${billingCycle === "yearly" ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setBillingCycle("yearly")}
              type="button"
            >
              Yearly
              <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] ${billingCycle === "yearly" ? "bg-sky-400/20 text-sky-200 dark:bg-cyan-300/20 dark:text-cyan-700" : "bg-sky-500/10 text-sky-700 dark:bg-cyan-300/10 dark:text-cyan-300"}`}>
                Save 5%
              </span>
            </button>
          </div>
        </div>

        <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-2">
          {plans.map((plan) => {
            const price =
              billingCycle === "monthly"
                ? plan.monthlyPrice
                : plan.yearlyMonthlyPrice;

            return (
              <article
                className={`relative flex min-h-full flex-col overflow-hidden rounded-[28px] border bg-card p-6 text-card-foreground transition-all duration-300 hover:-translate-y-1 sm:p-8 ${plan.featured ? "border-sky-500/35 shadow-[0_24px_80px_-34px_rgba(14,165,233,0.42)] dark:border-cyan-300/25 dark:shadow-[0_24px_80px_-34px_rgba(34,211,238,0.3)]" : "border-border shadow-[0_18px_65px_-42px_rgba(24,24,27,0.25)]"}`}
                key={plan.name}
              >
                <h2 className="text-2xl font-semibold tracking-[-0.04em]">
                  {plan.name}
                </h2>
                <p className="mt-2 min-h-12 max-w-md text-sm leading-6 text-muted-foreground">
                  {plan.description}
                </p>

                <div className="mt-7 flex items-end gap-2 border-b border-border pb-7">
                  <span className="text-5xl font-medium tracking-[-0.06em]">
                    ${price}
                  </span>
                  <span className="pb-1 text-xs text-muted-foreground">/ month</span>
                </div>
                <p className="mt-3 min-h-5 text-xs text-muted-foreground">
                  {billingCycle === "yearly"
                    ? `Billed $${plan.yearlyTotal} yearly after the 5% discount.`
                    : "Billed monthly. Switch plans whenever you need."}
                </p>

                <div className={`mt-6 rounded-2xl border p-4 ${plan.featured ? "border-sky-500/15 bg-sky-500/[0.06] dark:border-cyan-300/10 dark:bg-cyan-300/[0.045]" : "border-border bg-secondary/50"}`}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    Included every month
                  </p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-semibold tracking-[-0.04em]">
                      {plan.includedCredit}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {plan.creditLabel}
                    </span>
                  </div>
                </div>

                <ul className="mt-7 flex-1 space-y-4">
                  {plan.features.map((feature) => (
                    <li className="flex items-start gap-3 text-sm text-foreground/80" key={feature}>
                      <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${plan.featured ? "bg-sky-500/10 text-sky-700 dark:bg-cyan-300/10 dark:text-cyan-300" : "bg-stone-950/[0.06] text-stone-700 dark:bg-white/[0.07] dark:text-stone-300"}`}>
                        <Check className="size-3" strokeWidth={2.5} />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  className={`group mt-8 inline-flex h-12 items-center justify-between rounded-2xl px-5 text-sm font-semibold transition-all duration-300 active:scale-[0.99] ${plan.featured ? "bg-foreground text-background shadow-[0_14px_34px_-18px_rgba(14,165,233,0.8)] hover:bg-sky-600 hover:text-white hover:shadow-[0_18px_42px_-16px_rgba(14,165,233,0.85)] dark:hover:bg-cyan-300 dark:hover:text-stone-950" : "border border-border bg-background text-foreground hover:border-sky-500/40 hover:bg-sky-500/[0.05] dark:hover:border-cyan-300/30 dark:hover:bg-cyan-300/[0.07]"}`}
                  to={destination}
                >
                  Choose {plan.name}
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </article>
            );
          })}
        </div>

      </main>

      <footer className="px-4 pb-8 pt-8 sm:px-6 sm:pb-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 border-t border-stone-900/[0.07] pt-8 text-[10px] text-stone-500 dark:border-white/[0.06] dark:text-stone-700 sm:flex-row sm:items-center sm:justify-between">
          <Link className="flex items-center gap-2 font-semibold text-stone-700 dark:text-stone-400" to="/">
            <span className="flex size-7 items-center justify-center rounded-lg bg-stone-950 text-white dark:bg-white dark:text-stone-950">
              <WispMark className="size-5" />
            </span>
            Wisp
          </Link>
          <p>Model access, simplified.</p>
          <div className="flex items-center gap-5">
            <Link className="transition-colors hover:text-stone-950 dark:hover:text-stone-300" to="/#branching">
              Branching
            </Link>
            <Link className="transition-colors hover:text-stone-950 dark:hover:text-stone-300" to="/#models">
              Models
            </Link>
            <Link className="text-stone-950 dark:text-stone-300" to="/pricing">
              Pricing
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PricingPage;
