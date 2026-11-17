/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Fox brand lockup (icon + wordmark), drawn as inline SVG so it stays crisp at
 * every size and needs no image request (the old /logos/*.png files were never
 * shipped, which broke the logo and the favicon).
 */
export function FoxMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label="Fox"
      className={cn("h-full w-auto shrink-0", className)}
    >
      <defs>
        <linearGradient id="fox-mark-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fdba74" />
          <stop offset="1" stopColor="#ea580c" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#fox-mark-bg)" />
      <path d="M14 11 29.4 18 16.4 31.6Z" fill="#fff7ed" />
      <path d="M50 11 34.6 18 47.6 31.6Z" fill="#fff7ed" />
      <path d="M17.6 16.4 25.6 19.6 19 27Z" fill="#ea580c" />
      <path d="M46.4 16.4 38.4 19.6 45 27Z" fill="#ea580c" />
      <path d="M32 58C19.2 58 10 48.6 10 35.8 10 25 19.8 18.4 32 18.4s22 6.6 22 17.4C54 48.6 44.8 58 32 58Z" fill="#fff7ed" />
      <ellipse cx="23.6" cy="34.2" rx="3.2" ry="3.9" fill="#1c1917" />
      <ellipse cx="40.4" cy="34.2" rx="3.2" ry="3.9" fill="#1c1917" />
      <ellipse cx="32" cy="46.2" rx="12.4" ry="9.4" fill="#ffedd5" />
      <path d="M32 42.4c2 0 3.6 1.3 3.6 2.9s-1.6 3-3.6 3-3.6-1.4-3.6-3 1.6-2.9 3.6-2.9Z" fill="#1c1917" />
    </svg>
  );
}

export default function Logo({
  size = "sm",
  href = "/",
  iconOnly = false,
  className,
}: {
  size?: "sm" | "md" | "lg";
  href?: string;
  iconOnly?: boolean;
  className?: string;
}) {
  const heightCls =
    size === "lg"
      ? "h-16 sm:h-20"
      : size === "md"
        ? "h-10 sm:h-11"
        : "h-8 sm:h-9";
  const textCls =
    size === "lg"
      ? "text-3xl sm:text-4xl"
      : size === "md"
        ? "text-2xl"
        : "text-xl";

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex select-none items-center gap-2.5 bg-transparent transition-opacity hover:opacity-90",
        className,
      )}
      aria-label="Fox Search home"
    >
      <FoxMark className={heightCls} />
      {!iconOnly && (
        <span
          className={cn(
            "font-bold tracking-tight text-slate-900 dark:text-[#e8eaed]",
            textCls,
          )}
        >
          Fox
        </span>
      )}
    </Link>
  );
}
