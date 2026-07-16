import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const OAUTH_BASE_URL = (
  import.meta.env.VITE_OAUTH_BASE_URL || "https://rajandhamala.dev/api/oauth"
).replace(/\/$/, "");
const OAUTH_CLIENT_ID =
  import.meta.env.VITE_OAUTH_CLIENT_ID ||
  "f8145eb4-e4f8-47b6-8d1f-c813763182da";

const LoginPage = () => {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const savedTheme = window.localStorage.getItem("wisp-theme");
    if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("wisp-theme", theme);
  }, [theme]);

  const continueWith = (provider: "github" | "google") => {
    const params = new URLSearchParams({ client_id: OAUTH_CLIENT_ID });
    window.location.assign(
      `${OAUTH_BASE_URL}/${provider}?${params.toString()}`,
    );
  };

  return (
    <div className="min-h-dvh bg-white text-zinc-950 dark:bg-black dark:text-zinc-50">
      <header className="flex h-14 items-center justify-between px-4 sm:px-6">
        <Link
          className="flex items-center gap-2 rounded-lg text-sm font-semibold"
          to="/"
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white dark:bg-white dark:text-zinc-950">
            W
          </span>
          Wisp
        </Link>
        <button
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          className="flex size-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-white"
          onClick={() =>
            setTheme((current) => (current === "dark" ? "light" : "dark"))
          }
          type="button"
        >
          {theme === "dark" ? (
            <Sun className="size-[18px]" />
          ) : (
            <Moon className="size-[18px]" />
          )}
        </button>
      </header>

      <main className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-4 pb-14">
        <section className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-8">
          <div className="mb-7 space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Continue to Wisp
            </h1>
            <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              Sign in or create your account with one secure OAuth step.
            </p>
          </div>

          <div className="space-y-3">
            <button
              className="flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => continueWith("google")}
              type="button"
            >
              <svg className="size-[18px]" viewBox="0 0 24 24">
                <path
                  d="M21.6 12.23c0-.71-.06-1.4-.18-2.06H12v3.9h5.38a4.6 4.6 0 0 1-2 3.02v2.53h3.24c1.9-1.75 2.98-4.33 2.98-7.39Z"
                  fill="#4285F4"
                />
                <path
                  d="M12 22c2.7 0 4.98-.9 6.64-2.38l-3.24-2.53c-.9.6-2.05.96-3.4.96-2.6 0-4.81-1.76-5.6-4.13H3.04v2.6A10 10 0 0 0 12 22Z"
                  fill="#34A853"
                />
                <path
                  d="M6.4 13.92A6.01 6.01 0 0 1 6.1 12c0-.67.11-1.32.3-1.92v-2.6H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.52l3.36-2.6Z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.95c1.47 0 2.79.5 3.83 1.5l2.88-2.88A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.96 5.48l3.36 2.6c.79-2.37 3-4.13 5.6-4.13Z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>

            <button
              className="flex h-11 w-full items-center justify-center gap-3 rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              onClick={() => continueWith("github")}
              type="button"
            >
              <svg
                aria-hidden="true"
                className="size-[18px]"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.44 9.8 8.21 11.39.6.1.82-.26.82-.57 0-.29-.01-1.23-.01-2.24-3.02.56-3.8-.73-4.04-1.41-.13-.35-.72-1.41-1.23-1.7-.42-.22-1.02-.78-.01-.79.94-.02 1.62.87 1.84 1.23 1.08 1.81 2.81 1.3 3.5.99.1-.78.42-1.31.76-1.61-2.67-.3-5.46-1.33-5.46-5.92 0-1.31.47-2.39 1.23-3.23-.12-.3-.54-1.53.12-3.18 0 0 1.01-.31 3.3 1.23A11.5 11.5 0 0 1 12 5.8c1.02 0 2.04.13 3 .4 2.3-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.77.84 1.23 1.9 1.23 3.23 0 4.6-2.8 5.62-5.47 5.92.43.38.81 1.1.81 2.22 0 1.61-.01 2.9-.01 3.3 0 .31.22.69.82.57A12 12 0 0 0 24 12C24 5.37 18.63 0 12 0Z" />
              </svg>
              Continue with GitHub
            </button>
          </div>

          <p className="mt-6 text-center text-xs leading-5 text-zinc-500">
            New accounts are created automatically. By continuing, you agree
            to use Wisp responsibly.
          </p>
        </section>
      </main>
    </div>
  );
};

export default LoginPage;
