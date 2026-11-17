"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";
import { useToast } from "@/components/Toast";
import { api } from "@/lib/client";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo";
import { cn, safeInternalPath } from "@/lib/utils";

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-[#2e3240] dark:bg-[#14161a] dark:text-[#e8eaed]";

export default function AuthForm({
  mode,
  demoEnabled = false,
}: {
  mode: "login" | "signup";
  demoEnabled?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"form" | "demo" | null>(null);

  const authenticate = async (
    trigger: "form" | "demo",
    path: "login" | "signup",
    body: Record<string, string>,
  ) => {
    if (busy) return;
    setError(null);
    setBusy(trigger);

    const res = await api(`/api/auth/${path}`, { method: "POST", body });
    if (!res.ok) {
      setError(res.error ?? "Something went wrong. Please try again.");
      setBusy(null);
      return;
    }

    const session = await api("/api/auth/me");
    if (session.status === 401) {
      setError(
        "Signed in, but this browser blocked the session cookie. Allow cookies for this site — or open Fox in its own tab if it is embedded in another page — then try again.",
      );
      setBusy(null);
      return;
    }

    toast(path === "login" ? "Welcome back!" : "Account created — welcome to Fox!");
    router.push(safeInternalPath(new URLSearchParams(window.location.search).get("redirect")));
    router.refresh();
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void authenticate(
      "form",
      mode,
      mode === "login" ? { email: email.trim(), password } : { name: name.trim(), email: email.trim(), password },
    );
  };

  return (
    <div className="w-full max-w-sm animate-fade-up rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_24px_60px_rgba(16,24,40,0.12)] dark:border-[#2a2e39] dark:bg-[#1c1f26] dark:shadow-[0_24px_60px_rgba(0,0,0,0.5)] sm:p-8">
      <div className="text-center">
        <Logo size="md" href="/" className="justify-center" />
        <h1 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-[#8b92a1]">
          {mode === "login"
            ? "Sign in to see your history, saved results and collections."
            : "Free forever — save results, build collections, keep your history."}
        </p>
      </div>

      <form onSubmit={submit} className="mt-6 space-y-3.5" noValidate={false}>
        {mode === "signup" && (
          <div>
            <label htmlFor="name" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-[#8b92a1]">
              Name
            </label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ada Lovelace"
              required
              maxLength={80}
              className={inputCls}
              autoComplete="name"
            />
          </div>
        )}
        <div>
          <label htmlFor="email" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-[#8b92a1]">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className={inputCls}
            autoComplete="email"
            autoCapitalize="off"
            dir="ltr"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-[#8b92a1]">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
              required
              minLength={mode === "signup" ? 8 : undefined}
              maxLength={200}
              className={cn(inputCls, "pr-11")}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              dir="ltr"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-[#262a34] dark:hover:text-white"
              aria-label={showPw ? "Hide password" : "Show password"}
              aria-pressed={showPw}
            >
              <Icon name={showPw ? "eye-off" : "eye"} className="h-4 w-4" />
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700 dark:bg-red-500/15 dark:text-red-300">
            <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" /> <span>{error}</span>
          </p>
        )}

        <button
          type="submit"
          disabled={busy !== null}
          className="w-full rounded-full bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500 disabled:opacity-60"
        >
          {busy === "form" ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>

      {demoEnabled && (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void authenticate("demo", "login", { email: DEMO_EMAIL, password: DEMO_PASSWORD })}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-dashed border-brand-500/40 bg-brand-500/10 py-2.5 text-[13px] font-semibold text-brand-600 transition hover:bg-brand-500/15 disabled:opacity-60 dark:text-brand-400"
        >
          <Icon name="sparkles" className="h-4 w-4" />
          {busy === "demo" ? "Opening the demo…" : "Continue with the demo account"}
        </button>
      )}

      <p className="mt-5 text-center text-sm text-slate-500 dark:text-[#8b92a1]">
        {mode === "login" ? (
          <>
            New to Fox?{" "}
            <Link href="/signup" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
