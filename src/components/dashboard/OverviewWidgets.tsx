import Icon from "@/components/Icon";

export function StatCard({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: string | number;
  icon: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-[#262a34] dark:bg-[#1c1f26]">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500 dark:text-[#9ca3af]">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
          <Icon name={icon} className="h-[18px] w-[18px]" />
        </span>
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400 dark:text-[#7f8694]">{hint}</p>}
    </div>
  );
}

export function SearchChart({ data }: { data: Array<{ label: string; count: number }> }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#262a34] dark:bg-[#1c1f26]">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Search activity — last 14 days</h2>
        <span className="text-xs text-slate-400 dark:text-[#7f8694]">searches per day</span>
      </div>
      {data.every((d) => d.count === 0) ? (
        <p className="py-16 text-center text-sm text-slate-400 dark:text-[#7f8694]">
          No searches in the last 14 days yet.
        </p>
      ) : (
        <>
          <div className="mt-5 flex h-40 items-end gap-1.5">
            {data.map((d) => (
              <div key={d.label} className="group relative flex h-full flex-1 items-end">
                <div
                  className="w-full rounded-t-md bg-brand-500/75 transition group-hover:bg-brand-500"
                  style={{ height: `${Math.max(d.count > 0 ? 6 : 2, (d.count / max) * 100)}%` }}
                  title={`${d.label}: ${d.count} search${d.count === 1 ? "" : "es"}`}
                />
                <span className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-xs font-medium text-white group-hover:block">
                  {d.count}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-slate-400 dark:text-[#7f8694]">
            <span>{data[0]?.label ?? ""}</span>
            <span>{data[data.length - 1]?.label ?? ""}</span>
          </div>
        </>
      )}
    </div>
  );
}

export function TabBadge({ tab }: { tab: string }) {
  const styles: Record<string, string> = {
    all: "bg-slate-100 text-slate-600 dark:bg-[#262a34] dark:text-[#b0b6c2]",
    news: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    images: "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
    videos: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  };
  const label: Record<string, string> = { all: "All", news: "News", images: "Images", videos: "Videos" };
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${styles[tab] ?? styles.all}`}
    >
      {label[tab] ?? tab}
    </span>
  );
}
