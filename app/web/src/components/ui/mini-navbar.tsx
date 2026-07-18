"use client";

import { ArrowUpRight, Menu, Moon, Sun, X } from "lucide-react";
import { useEffect, useState, type MouseEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import useUserStore from "@/UserStore";

const navLinks = [
  { label: "Models", href: "/#models" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "/#faq" },
];

export function Navbar({
  onThemeToggle,
  theme,
}: {
  onThemeToggle: () => void;
  theme: "dark" | "light";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const currentUser = useUserStore((state) => state.currentUser);
  const destination = currentUser ? "/session" : "/login";

  const isActive = (href: string) => {
    if (href === "/pricing") return location.pathname === href;
    const hash = href.slice(href.indexOf("#"));
    return location.pathname === "/" && location.hash === hash;
  };

  const handleSectionClick = (
    event: MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    const hashIndex = href.indexOf("#");
    if (hashIndex < 0 || location.pathname !== "/") return;

    const hash = href.slice(hashIndex);
    if (location.hash !== hash) return;

    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (!target) return;

    event.preventDefault();
    window.scrollTo({
      behavior: "smooth",
      top: target.getBoundingClientRect().top + window.scrollY - 20,
    });
  };

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  return (
    <header className="absolute inset-x-0 top-0 z-30 border-b border-stone-900/[0.07] bg-[#f7f7f6]/80 backdrop-blur-xl transition-colors dark:border-white/[0.055] dark:bg-[#070707]/80">
      <div className="flex h-[68px] w-full items-center justify-between px-4 sm:px-6 lg:px-12 xl:px-[7%]">
        <Link
          aria-label="Wisp home"
          className="group rounded-xl outline-none ring-sky-500/30 focus-visible:ring-4"
          to="/"
        >
          <img
            alt=""
            aria-hidden="true"
            className="size-9 rounded-xl shadow-sm transition-transform duration-300 group-hover:-rotate-6"
            src="/wisp-logo-dark.svg"
          />
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-5 lg:flex">
          {navLinks.map((link) => (
            <Link
              aria-current={isActive(link.href) ? "page" : undefined}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${isActive(link.href) ? "text-stone-950 dark:text-white" : "text-stone-700 hover:bg-black/[0.045] hover:text-stone-950 dark:text-stone-300 dark:hover:bg-white/[0.06] dark:hover:text-white"}`}
              key={link.href}
              onClick={(event) => handleSectionClick(event, link.href)}
              to={link.href}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-1 lg:flex">
          <button
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="flex size-9 items-center justify-center rounded-lg text-stone-700 transition-colors hover:bg-black/[0.05] hover:text-stone-950 dark:text-stone-300 dark:hover:bg-white/[0.06] dark:hover:text-white"
            onClick={onThemeToggle}
            type="button"
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          {!currentUser && (
            <Link className="rounded-lg px-3 py-2 text-sm font-semibold text-stone-700 transition-colors hover:text-stone-950 dark:text-stone-300 dark:hover:text-white" to="/login">
              Sign in
            </Link>
          )}
          <Link className="group ml-1 inline-flex h-9 items-center gap-2 rounded-xl bg-stone-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-sky-600 dark:bg-white dark:text-stone-950 dark:hover:bg-cyan-300" to={destination}>
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

      <div className={`overflow-hidden border-t bg-white/98 px-4 transition-all duration-300 dark:bg-[#0b0b0b]/98 lg:hidden ${isOpen ? "max-h-[28rem] border-stone-900/[0.07] py-4 opacity-100 dark:border-white/[0.06]" : "pointer-events-none max-h-0 border-transparent py-0 opacity-0"}`}>
        <nav aria-label="Mobile navigation" className="flex flex-col">
          {navLinks.map((link) => (
            <Link
              aria-current={isActive(link.href) ? "page" : undefined}
              className={`rounded-lg px-3 py-3 text-base font-semibold transition-colors ${isActive(link.href) ? "bg-stone-950 text-white dark:bg-white dark:text-stone-950" : "text-stone-800 hover:bg-black/[0.05] dark:text-stone-200 dark:hover:bg-white/[0.06]"}`}
              key={link.href}
              onClick={(event) => {
                setIsOpen(false);
                handleSectionClick(event, link.href);
              }}
              to={link.href}
            >
              {link.label}
            </Link>
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
