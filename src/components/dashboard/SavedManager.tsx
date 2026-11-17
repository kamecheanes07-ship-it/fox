"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useMemo, useState } from "react";
import EmptyState from "@/components/EmptyState";
import Icon from "@/components/Icon";
import Modal from "@/components/Modal";
import TimeAgo from "@/components/TimeAgo";
import { useToast } from "@/components/Toast";
import { api, restoreAt } from "@/lib/client";
import type { CollectionDTO, SavedItemDTO } from "@/lib/types";
import { cn, domainOf, faviconOf, isHttpUrl, truncate } from "@/lib/utils";

const KIND_FILTERS = [
  { key: "all", label: "All", icon: "grid" },
  { key: "web", label: "Web", icon: "globe" },
  { key: "news", label: "News", icon: "news" },
  { key: "image", label: "Images", icon: "image" },
  { key: "video", label: "Videos", icon: "video" },
];

const KIND_LABEL: Record<string, string> = { web: "Web", news: "News", image: "Image", video: "Video" };
const KIND_ICON: Record<string, string> = { web: "globe", news: "news", image: "image", video: "video" };

const isPending = (id: string) => id.startsWith("temp-");

type SavedRow = Omit<SavedItemDTO, "collectionName" | "collectionColor">;

interface Draft {
  url: string;
  title: string;
  kind: string;
  note: string;
  collectionId: string | null;
}

type ModalState = { mode: "create" } | { mode: "edit"; item: SavedItemDTO } | null;

function Thumb({ item }: { item: SavedItemDTO }) {
  const [failed, setFailed] = useState(false);
  if (item.thumbnail && !failed) {
    return (
      <img
        src={item.thumbnail}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
      />
    );
  }
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-50 to-brand-50 dark:from-[#16181f] dark:to-[#222631]">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-[#252832] dark:ring-white/10">
        <img src={faviconOf(item.url)} alt="" className="h-6 w-6" loading="lazy" />
      </span>
      <span className="max-w-[80%] truncate text-xs font-medium text-slate-500 dark:text-[#9ca3af]">
        {domainOf(item.url)}
      </span>
    </div>
  );
}

export default function SavedManager({
  initialItems,
  collections,
  initialCollection = "all",
}: {
  initialItems: SavedItemDTO[];
  collections: CollectionDTO[];
  initialCollection?: string;
}) {
  const [items, setItems] = useState(initialItems);
  const [kind, setKind] = useState("all");
  const [collectionFilter, setCollectionFilter] = useState(initialCollection);
  const [text, setText] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const { toast } = useToast();

  const collectionById = useMemo(() => new Map(collections.map((c) => [c.id, c])), [collections]);

  const decorate = (row: SavedRow): SavedItemDTO => {
    const collection = row.collectionId ? collectionById.get(row.collectionId) : undefined;
    return { ...row, collectionName: collection?.name ?? null, collectionColor: collection?.color ?? null };
  };

  const filtered = useMemo(() => {
    const needle = text.trim().toLowerCase();
    return items.filter(
      (i) =>
        (kind === "all" || i.kind === kind) &&
        (collectionFilter === "all" ||
          (collectionFilter === "none" ? i.collectionId === null : i.collectionId === collectionFilter)) &&
        (!needle ||
          i.title.toLowerCase().includes(needle) ||
          i.url.toLowerCase().includes(needle) ||
          i.note.toLowerCase().includes(needle)),
    );
  }, [items, kind, collectionFilter, text]);

  const remove = async (item: SavedItemDTO) => {
    const index = items.findIndex((i) => i.id === item.id);
    setItems((cur) => cur.filter((i) => i.id !== item.id));
    const res = await api(`/api/saved/${item.id}`, { method: "DELETE" });
    if (!res.ok && res.status !== 404) {
      setItems((cur) => restoreAt(cur, item, index));
      toast(res.error ?? "Could not remove the saved result.", "error");
      return;
    }
    toast("Removed from saved results");
  };

  const update = async (item: SavedItemDTO, patch: { title: string; note: string; collectionId: string | null }) => {
    const optimistic = decorate({ ...item, ...patch });
    setItems((cur) => cur.map((i) => (i.id === item.id ? optimistic : i)));
    setModal(null);
    const res = await api(`/api/saved/${item.id}`, { method: "PATCH", body: patch });
    if (!res.ok) {
      setItems((cur) => cur.map((i) => (i.id === item.id ? item : i)));
      toast(res.error ?? "Could not save changes.", "error");
      return;
    }
    toast("Saved result updated");
  };

  const create = async (draft: Draft) => {
    const now = new Date().toISOString();
    const tempId = `temp-${Date.now()}`;
    const optimistic = decorate({
      id: tempId,
      kind: draft.kind,
      title: draft.title,
      url: draft.url,
      snippet: "",
      thumbnail: "",
      source: domainOf(draft.url),
      query: "",
      note: draft.note,
      collectionId: draft.collectionId,
      createdAt: now,
      updatedAt: now,
    });
    setItems((cur) => [optimistic, ...cur]);
    setModal(null);
    const res = await api<{ item: SavedRow; alreadySaved: boolean }>("/api/saved", {
      method: "POST",
      body: {
        kind: draft.kind,
        title: draft.title,
        url: draft.url,
        note: draft.note,
        collectionId: draft.collectionId,
      },
    });
    if (!res.ok || !res.data) {
      setItems((cur) => cur.filter((i) => i.id !== tempId));
      toast(res.error ?? "Could not save the link.", "error");
      return;
    }
    const saved = decorate(res.data.item);
    setItems((cur) => [saved, ...cur.filter((i) => i.id !== tempId && i.id !== saved.id)]);
    toast(res.data.alreadySaved ? "That link was already saved — it has been updated" : "Link saved");
  };

  const filtersActive = kind !== "all" || collectionFilter !== "all" || text.trim() !== "";

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="no-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-full border border-slate-200 bg-white p-1 dark:border-[#2a2e39] dark:bg-[#1c1f26]">
          {KIND_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setKind(f.key)}
              aria-pressed={kind === f.key}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium transition",
                kind === f.key
                  ? "bg-brand-600 text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-[#b0b6c2] dark:hover:bg-[#262a34]",
              )}
            >
              <Icon name={f.icon} className="h-3.5 w-3.5" />
              {f.label}
            </button>
          ))}
        </div>
        <select
          value={collectionFilter}
          onChange={(e) => setCollectionFilter(e.target.value)}
          className="max-w-[12rem] rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-600 focus:border-brand-500 focus:outline-none dark:border-[#2a2e39] dark:bg-[#1c1f26] dark:text-[#d1d5db]"
          aria-label="Filter by collection"
        >
          <option value="all">All collections</option>
          <option value="none">No collection</option>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 dark:border-[#2a2e39] dark:bg-[#1c1f26] sm:max-w-xs">
          <Icon name="search" className="h-4 w-4 text-slate-400" />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Filter saved results…"
            aria-label="Filter saved results"
            dir="auto"
            className="w-full min-w-0 bg-transparent text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-[#e8eaed] dark:placeholder:text-[#7f8694]"
          />
        </label>
        <span className="text-xs text-slate-400 dark:text-[#7f8694]">
          {filtered.length} {filtered.length === 1 ? "result" : "results"}
        </span>
        <button
          type="button"
          onClick={() => setModal({ mode: "create" })}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-3.5 py-1.5 text-[13px] font-semibold text-white transition hover:bg-brand-500"
        >
          <Icon name="plus" className="h-4 w-4" /> Add link
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white dark:border-[#262a34] dark:bg-[#1c1f26]">
          <EmptyState
            icon="bookmark"
            title={items.length === 0 ? "Nothing saved yet" : "No saved results match these filters"}
            description={
              items.length === 0
                ? "While searching, tap the bookmark icon on any result to save it here — or add a link by hand."
                : "Try a different type, collection or text filter."
            }
          >
            {filtersActive && items.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setKind("all");
                  setCollectionFilter("all");
                  setText("");
                }}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-[#2a2e39] dark:bg-[#23262f] dark:text-[#e2e5ec]"
              >
                Reset filters
              </button>
            ) : (
              <>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-500"
                >
                  <Icon name="search" className="h-4 w-4" /> Go search
                </Link>
                <button
                  type="button"
                  onClick={() => setModal({ mode: "create" })}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-[#2a2e39] dark:bg-[#23262f] dark:text-[#e2e5ec]"
                >
                  <Icon name="link" className="h-4 w-4" /> Add a link
                </button>
              </>
            )}
          </EmptyState>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const pending = isPending(item.id);
            return (
              <article
                key={item.id}
                className={cn(
                  "group flex animate-fade-up flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md dark:border-[#262a34] dark:bg-[#1c1f26]",
                  pending && "opacity-60",
                )}
              >
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  tabIndex={-1}
                  aria-hidden
                  className="relative block h-36 overflow-hidden bg-slate-100 dark:bg-[#16181f]"
                >
                  <Thumb item={item} />
                  <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-semibold text-slate-700 shadow-sm ring-1 ring-black/5 dark:bg-[#1c1f26]/95 dark:text-[#e2e5ec]">
                    <Icon name={KIND_ICON[item.kind] ?? "globe"} className="h-3.5 w-3.5" />
                    {KIND_LABEL[item.kind] ?? "Web"}
                  </span>
                </a>
                <div className="flex flex-1 flex-col p-4">
                  <h3 dir="auto" className="text-[15px] font-semibold leading-snug">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="line-clamp-2 text-slate-900 hover:text-brand-600 hover:underline dark:text-white dark:hover:text-brand-400"
                      title={item.title}
                    >
                      {item.title}
                    </a>
                  </h3>
                  {item.snippet && (
                    <p dir="auto" className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-slate-500 dark:text-[#9ca3af]">
                      {item.snippet}
                    </p>
                  )}
                  {item.note && (
                    <p
                      dir="auto"
                      className="mt-2 line-clamp-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs italic text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"
                    >
                      “{truncate(item.note, 140)}”
                    </p>
                  )}
                  <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-400 dark:text-[#7f8694]">
                    <span className="max-w-full truncate font-medium text-slate-500 dark:text-[#9ca3af]">
                      {item.source || domainOf(item.url)}
                    </span>
                    {item.query && (
                      <>
                        <span aria-hidden>•</span>
                        <Link
                          href={`/search?q=${encodeURIComponent(item.query)}&tab=all`}
                          dir="auto"
                          className="max-w-full truncate hover:text-brand-500 hover:underline"
                          title={`From search: ${item.query}`}
                        >
                          “{truncate(item.query, 40)}”
                        </Link>
                      </>
                    )}
                    <span aria-hidden>•</span>
                    {pending ? <span>saving…</span> : <TimeAgo date={item.createdAt} />}
                  </div>
                  {item.collectionName && (
                    <span
                      className="mt-2 inline-flex w-fit max-w-full items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                      style={{ backgroundColor: item.collectionColor ?? "#f36316" }}
                    >
                      <Icon name="folder" className="h-3 w-3" /> <span className="truncate">{item.collectionName}</span>
                    </span>
                  )}
                  <div className="mt-auto pt-3">
                    <div className="flex items-center gap-1 border-t border-slate-100 pt-3 dark:border-[#262a34]">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => setModal({ mode: "edit", item })}
                        className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:text-[#b0b6c2] dark:hover:bg-[#252934]"
                      >
                        <Icon name="edit" className="h-3.5 w-3.5" /> Edit
                      </button>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:text-[#b0b6c2] dark:hover:bg-[#252934]"
                      >
                        <Icon name="external" className="h-3.5 w-3.5" /> Open
                      </a>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => remove(item)}
                        className="ml-auto flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-500/15"
                      >
                        <Icon name="trash" className="h-3.5 w-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {modal?.mode === "edit" && (
        <ItemModal
          key={modal.item.id}
          item={modal.item}
          collections={collections}
          onClose={() => setModal(null)}
          onSubmit={(draft) =>
            update(modal.item, { title: draft.title, note: draft.note, collectionId: draft.collectionId })
          }
        />
      )}
      {modal?.mode === "create" && (
        <ItemModal
          item={null}
          collections={collections}
          defaultCollectionId={collectionById.has(collectionFilter) ? collectionFilter : null}
          onClose={() => setModal(null)}
          onSubmit={create}
        />
      )}
    </div>
  );
}

const fieldCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-[#2e3240] dark:bg-[#14161a] dark:text-[#e8eaed]";
const labelCls = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-[#8b92a1]";

function ItemModal({
  item,
  collections,
  defaultCollectionId = null,
  onClose,
  onSubmit,
}: {
  item: SavedItemDTO | null;
  collections: CollectionDTO[];
  defaultCollectionId?: string | null;
  onClose: () => void;
  onSubmit: (draft: Draft) => void;
}) {
  const [url, setUrl] = useState(item?.url ?? "");
  const [title, setTitle] = useState(item?.title ?? "");
  const [kind, setKind] = useState(item?.kind ?? "web");
  const [note, setNote] = useState(item?.note ?? "");
  const [collectionId, setCollectionId] = useState(item?.collectionId ?? defaultCollectionId ?? "none");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const rawUrl = url.trim();
    const fullUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    if (!item && (!rawUrl || !isHttpUrl(fullUrl) || !domainOf(fullUrl).includes("."))) {
      setError("Enter a valid web address, for example https://example.com/article");
      return;
    }
    const finalTitle = title.trim() || (item ? "" : domainOf(fullUrl));
    if (!finalTitle) {
      setError("Title cannot be empty.");
      return;
    }
    onSubmit({
      url: item ? item.url : fullUrl,
      title: finalTitle,
      kind,
      note: note.trim(),
      collectionId: collectionId === "none" ? null : collectionId,
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={item ? "Edit saved result" : "Add a link"}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-[#2e3240] dark:text-[#b0b6c2] dark:hover:bg-[#252934]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-500"
          >
            {item ? "Save changes" : "Save link"}
          </button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {!item && (
          <label className="block">
            <span className={labelCls}>Web address</span>
            <input
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError(null);
              }}
              placeholder="https://example.com/article"
              inputMode="url"
              autoCapitalize="off"
              autoFocus
              dir="ltr"
              className={fieldCls}
            />
          </label>
        )}
        <label className="block">
          <span className={labelCls}>Title</span>
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setError(null);
            }}
            placeholder={item ? undefined : "Optional — defaults to the site name"}
            maxLength={300}
            dir="auto"
            autoFocus={Boolean(item)}
            className={fieldCls}
          />
        </label>
        <div className={cn("grid gap-4", !item && "sm:grid-cols-2")}>
          {!item && (
            <label className="block">
              <span className={labelCls}>Type</span>
              <select value={kind} onChange={(e) => setKind(e.target.value)} className={fieldCls}>
                <option value="web">Web page</option>
                <option value="news">News article</option>
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
            </label>
          )}
          <label className="block">
            <span className={labelCls}>Collection</span>
            <select value={collectionId} onChange={(e) => setCollectionId(e.target.value)} className={fieldCls}>
              <option value="none">No collection</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block">
          <span className={labelCls}>Note</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Add a private note…"
            dir="auto"
            className={cn(fieldCls, "resize-none")}
          />
        </label>
        {error && (
          <p role="alert" className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700 dark:bg-red-500/15 dark:text-red-300">
            <Icon name="alert" className="h-4 w-4 shrink-0" /> {error}
          </p>
        )}
        {item && (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex max-w-full items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            <span className="truncate">{truncate(item.url, 70)}</span> <Icon name="external" className="h-3 w-3" />
          </a>
        )}
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
}
