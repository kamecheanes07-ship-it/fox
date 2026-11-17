import type { ReactNode } from "react";
import Icon from "@/components/Icon";
import { cn } from "@/lib/utils";

export default function EmptyState({
  icon = "search",
  title,
  description,
  children,
  className,
}: {
  icon?: string;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-16 text-center", className)}>
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500">
        <Icon name={icon} className="h-8 w-8" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-[#e8eaed]">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-slate-500 dark:text-[#8b92a1]">{description}</p>
      )}
      {children && <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{children}</div>}
    </div>
  );
}
