"use client";

import { ArrowUpRight, Menu, Moon, Sun, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useUserStore from "@/UserStore";
import { WispMark } from "@/components/ui/model-provider-icons";

const navLinks = [
  { label: "Branching", href: "#branching" },
  { label: "Models", href: "#models" },
];

export function Navbar({
  onThemeToggle,
  theme,
}: {
  onThemeToggle: () => void;
  theme: "dark" | "light";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const currentUser = useUserStore((state) => state.currentUser);
  const destination = currentUser ? "/session" : "/login";

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  return (
    <header className="absolute inset-x-0 top-0 z-30 border-b border-stone-900/[0.07] bg-[#f7f7f6]/70 backdrop-blur-xl transition-colors dark:border-white/[0.055] dark:bg-[#070707]/70">
      <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link aria-label="Wisp home" className="group flex items-center gap-2.5" to="/">
          <span className="flex size-8 items-center justify-center rounded-xl bg-stone-950 text-white shadow-sm transition-transform duration-300 group-hover:-rotate-6 dark:bg-stone-50 dark:text-stone-950">
            <WispMark className="size-[22px]" />
          </span>
          <span className="text-[15px] font-semibold tracking-[-0.025em] text-stone-950 dark:text-white">Wisp</span>
          <span className="hidden rounded-full border border-sky-700/15 bg-sky-500/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-sky-800 dark:border-cyan-300/10 dark:text-cyan-300 sm:inline-flex">
            Model access, simplified
          </span>
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-7 lg:flex">
          {navLinks.map((link) => (
            <a className="text-xs font-medium text-stone-500 transition-colors hover:text-stone-950 dark:text-stone-500 dark:hover:text-white" href={link.href} key={link.href}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-1 lg:flex">
          <button
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="flex size-9 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-black/[0.05] hover:text-stone-950 dark:hover:bg-white/[0.06] dark:hover:text-white"
            onClick={onThemeToggle}
            type="button"
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          {!currentUser && (
            <Link className="rounded-lg px-3 py-2 text-xs font-medium text-stone-500 transition-colors hover:text-stone-950 dark:hover:text-white" to="/login">
              Sign in
            </Link>
          )}
          <Link className="group ml-1 inline-flex h-9 items-center gap-2 rounded-xl bg-stone-950 px-4 text-xs font-semibold text-white transition-colors hover:bg-sky-600 dark:bg-white dark:text-stone-950 dark:hover:bg-cyan-300" to={destination}>
            {currentUser ? "Open workspace" : "Start chatting"}
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <button
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="flex size-9 items-center justify-center rounded-lg text-stone-600 dark:text-stone-300"
            onClick={onThemeToggle}
            type="button"
          >
            {theme === "dark" ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
          </button>
          <button
            aria-expanded={isOpen}
            aria-label={isOpen ? "Close navigation" : "Open navigation"}
            className="flex size-9 items-center justify-center rounded-lg text-stone-700 transition-colors hover:bg-black/[0.05] dark:text-stone-300 dark:hover:bg-white/[0.07]"
            onClick={() => setIsOpen((open) => !open)}
            type="button"
          >
            {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <div className={`overflow-hidden border-t bg-white/98 px-4 transition-all duration-300 dark:bg-[#0b0b0b]/98 lg:hidden ${isOpen ? "max-h-96 border-stone-900/[0.07] py-4 opacity-100 dark:border-white/[0.06]" : "pointer-events-none max-h-0 border-transparent py-0 opacity-0"}`}>
        <nav aria-label="Mobile navigation" className="mx-auto flex max-w-7xl flex-col">
          {navLinks.map((link) => (
            <a className="border-b border-stone-900/[0.06] py-3 text-sm font-medium text-stone-700 last:border-0 dark:border-white/[0.05] dark:text-stone-300" href={link.href} key={link.href} onClick={() => setIsOpen(false)}>
              {link.label}
            </a>
          ))}
          <Link className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 py-3 text-sm font-semibold text-white dark:bg-white dark:text-stone-950" onClick={() => setIsOpen(false)} to={destination}>
            {currentUser ? "Open workspace" : "Start chatting"}
            <ArrowUpRight className="size-4" />
          </Link>
        </nav>
      </div>
    </header>
  );
}
