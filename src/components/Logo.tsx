/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Fox brand lockup (icon + wordmark).
 *
 * The mark artwork lives in `assets-src/fox-mark.svg` and is exported to
 * `public/logos/fox-icon.png`, `fox-dark.png` and `fox-light.png`, which is what
 * this component renders (dark and light variants, swapped by the theme).
 * `FoxMark` renders the same artwork inline, for places that must not issue an
 * extra image request (e.g. the search field).
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
          <stop offset="0" stopColor="#fbb36c" />
          <stop offset="1" stopColor="#eb6014" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#fox-mark-bg)" />
      <path d="M11.4 11.4 27.6 20.4 12 31Z" fill="#fff7ed" />
      <path d="M52.6 11.4 36.4 20.4 52 31Z" fill="#fff7ed" />
      <path d="M15 16.6 22.6 20.6 15.4 25.4Z" fill="#f4741f" />
      <path d="M49 16.6 41.4 20.6 48.6 25.4Z" fill="#f4741f" />
      <ellipse cx="32" cy="36.6" rx="22.4" ry="22.2" fill="#fff7ed" />
      <ellipse cx="32" cy="45.4" rx="14.6" ry="10.6" fill="#fdf1e0" />
      <ellipse cx="23.4" cy="34.6" rx="2.8" ry="3.6" fill="#141414" />
      <ellipse cx="40.6" cy="34.6" rx="2.8" ry="3.6" fill="#141414" />
      <circle cx="32" cy="45.8" r="3" fill="#141414" />
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
        ? "h-11 sm:h-12"
        : "h-8 sm:h-9";

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex select-none items-center bg-transparent transition-opacity hover:opacity-90",
        className,
      )}
      aria-label="Fox Search home"
    >
      {iconOnly ? (
        <img
          src="/logos/fox-icon.png"
          alt="Fox"
          className={cn("w-auto object-contain bg-transparent", heightCls)}
        />
      ) : (
        <>
          <img
            src="/logos/fox-dark.png"
            alt="Fox"
            className={cn("hidden w-auto object-contain bg-transparent dark:block", heightCls)}
          />
          <img
            src="/logos/fox-light.png"
            alt="Fox"
            className={cn("block w-auto object-contain bg-transparent dark:hidden", heightCls)}
          />
        </>
      )}
    </Link>
  );
}
