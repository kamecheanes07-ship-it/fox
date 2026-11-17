/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Fox brand lockup (icon + wordmark).
 *
 * Artwork comes from the user's original logo files. Because the source images
 * were JPEGs with a painted checkerboard instead of real transparency, the mark
 * was extracted once into `assets-src/fox-mark.png` and exported to:
 *   public/logos/fox-dark.png   -> icon + white "FOX"  (dark theme)
 *   public/logos/fox-light.png  -> icon + black "FOX"  (light theme)
 *   public/logos/fox-icon.png   -> icon only (search field)
 * `FoxMark` renders the icon-only artwork for compact spots (search field).
 */
export function FoxMark({ className }: { className?: string }) {
  return (
    <img
      src="/logos/fox-icon.png"
      alt="Fox"
      className={cn("w-auto object-contain select-none", className)}
    />
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
