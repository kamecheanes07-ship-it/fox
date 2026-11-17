"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import EmptyState from "@/components/EmptyState";
import Icon from "@/components/Icon";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { api, restoreAt } from "@/lib/client";
import type { CollectionDTO } from "@/lib/types";
import { COLLECTION_COLORS, cn, formatDate } from "@/lib/utils";

const isPending = (id: string) => id.startsWith("temp-");

function ColorPicker({ value, onChange, size = "sm" }: { value: string; onChange: (c: string) => void; size?: "sm" | "md" }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Collection color">
      {COLLECTION_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={`Color ${c}`}
          onClick={() => onChange(c)}
          className={cn(
            "rounded-full transition",
            size === "md" ? "h-7 w-7" : "h-5 w-5",
            value === c && "ring-2 ring-slate-800 ring-offset-2 dark:ring-white dark:ring-offset-[#1c1f26]",
          )}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}

export default function CollectionsManager({ initial }: { initial: CollectionDTO[] }) {
  const [items, setItems] = useState(initial);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLLECTION_COLORS[0]);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CollectionDTO | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();

  useEffect(
    () => () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
    },
    [],
  );

  const create = async () => {
    const cleanName = name.trim();
    if (!cleanName || creating) return;
    setCreating(true);
    const now = new Date().toISOString();
    const optimistic: CollectionDTO = {
      id: `temp-${Date.now()}`,
      name: cleanName,
      description: description.trim(),
      color,
      itemCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    setItems((cur) => [optimistic, ...cur]);
    const res = await api<{ item: CollectionDTO }>("/api/collections", {
      method: "POST",
      body: { name: optimistic.name, description: optimistic.description, color },
    });
    setCreating(false);
    if (!res.ok || !res.data) {
      setItems((cur) => cur.filter((c) => c.id !== optimistic.id));
      toast(res.error ?? "Could not create the collection.", "error");
      return;
    }
    const created = res.data.item;
    setItems((cur) => cur.map((c) => (c.id === optimistic.id ? created : c)));
    setName("");
    setDescription("");
    toast(`Collection “${created.name}” created`);
  };

  const saveEdit = async (original: CollectionDTO, patch: { name: string; description: string; color: string }) => {
    setItems((cur) => cur.map((c) => (c.id === original.id ? { ...c, ...patch } : c)));
    setEditing(null);
    const res = await api(`/api/collections/${original.id}`, { method: "PATCH", body: patch });
    if (!res.ok) {
      setItems((cur) => cur.map((c) => (c.id === original.id ? original : c)));
      toast(res.error ?? "Could not save changes.", "error");
      return;
    }
    toast("Collection updated");
  };

  const remove = async (item: CollectionDTO) => {
    if (confirmDelete !== item.id) {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      setConfirmDelete(item.id);
      confirmTimer.current = setTimeout(() => setConfirmDelete(null), 4000);
      return;
    }
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    setConfirmDelete(null);
    const index = items.findIndex((c) => c.id === item.id);
    setItems((cur) => cur.filter((c) => c.id !== item.id));
    const res = await api(`/api/collections/${item.id}`, { method: "DELETE" });
    if (!res.ok && res.status !== 404) {
      setItems((cur) => restoreAt(cur, item, index));
      toast(res.error ?? "Could not delete the collection.", "error");
      return;
    }
    toast("Collection deleted — its saved items were kept");
  };

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void create();
        }}
        className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#262a34] dark:bg-[#1c1f26]"
      >
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          <Icon name="plus" className="h-4 w-4 text-brand-500" /> New collection
        </h2>
        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name, e.g. “Trip to Japan”"
            aria-label="Collection name"
            maxLength={60}
            dir="auto"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-[#2e3240] dark:bg-[#14161a] dark:text-[#e8eaed]"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            aria-label="Collection description"
            maxLength={300}
            dir="auto"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-[#2e3240] dark:bg-[#14161a] dark:text-[#e8eaed]"
          />
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-slate-200 px-2.5 py-2 dark:border-[#2e3240]">
              <ColorPicker value={color} onChange={setColor} />
            </div>
            <button
              type="submit"
              disabled={!name.trim() || creating}
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-500 disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create"}
            </button>
          </div>
        </div>
      </form>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white dark:border-[#262a34] dark:bg-[#1c1f26]">
          <EmptyState
            icon="folder"
            title="No collections yet"
            description="Collections let you organize saved results — create your first one above."
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => {
            const pending = isPending(c.id);
            return (
              <article
                key={c.id}
                className={cn(
                  "group flex animate-fade-up flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-[#262a34] dark:bg-[#1c1f26]",
                  pending && "opacity-60",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="mt-1 h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                  {!pending && (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setEditing(c)}
                        className="reveal-on-hover rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-[#252934] dark:hover:text-white"
                        aria-label={`Edit collection ${c.name}`}
                      >
                        <Icon name="edit" className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(c)}
                        className={cn(
                          "rounded-full p-1.5 transition",
                          confirmDelete === c.id
                            ? "bg-red-600 text-white hover:bg-red-700"
                            : "reveal-on-hover text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/15",
                        )}
                        aria-label={confirmDelete === c.id ? `Confirm deleting ${c.name}` : `Delete collection ${c.name}`}
                      >
                        <Icon name="trash" className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                <h3 dir="auto" className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
                  {pending ? (
                    c.name
                  ) : (
                    <Link href={`/dashboard/saved?collection=${c.id}`} className="hover:text-brand-500 hover:underline">
                      {c.name}
                    </Link>
                  )}
                </h3>
                {c.description && (
                  <p dir="auto" className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-[#9ca3af]">
                    {c.description}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400 dark:text-[#7f8694]">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600 dark:bg-[#262a34] dark:text-[#d1d5db]">
                    <Icon name="bookmark" className="h-3 w-3" /> {c.itemCount} {c.itemCount === 1 ? "item" : "items"}
                  </span>
                  <span>{pending ? "saving…" : `created ${formatDate(c.createdAt)}`}</span>
                </div>
                {confirmDelete === c.id && (
                  <p className="mt-2 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 dark:bg-red-500/15 dark:text-red-300">
                    Click the trash icon again to delete. Saved items are kept.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}

      {editing && (
        <EditCollectionModal
          key={editing.id}
          collection={editing}
          onClose={() => setEditing(null)}
          onSave={(patch) => saveEdit(editing, patch)}
        />
      )}
    </div>
  );
}

function EditCollectionModal({
  collection,
  onClose,
  onSave,
}: {
  collection: CollectionDTO;
  onClose: () => void;
  onSave: (patch: { name: string; description: string; color: string }) => void;
}) {
  const [name, setName] = useState(collection.name);
  const [description, setDescription] = useState(collection.description);
  const [color, setColor] = useState(collection.color);
  const canSave = name.trim().length > 0;

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit collection"
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
            disabled={!canSave}
            onClick={() => onSave({ name: name.trim(), description: description.trim(), color })}
            className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-500 disabled:opacity-50"
          >
            Save changes
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-[#8b92a1]">
            Name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            dir="auto"
            autoFocus
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-[#2e3240] dark:bg-[#14161a] dark:text-[#e8eaed]"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-[#8b92a1]">
            Description
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            maxLength={300}
            dir="auto"
            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-[#2e3240] dark:bg-[#14161a] dark:text-[#e8eaed]"
          />
        </label>
        <div>
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-[#8b92a1]">
            Color
          </span>
          <ColorPicker value={color} onChange={setColor} size="md" />
        </div>
      </div>
    </Modal>
  );
}
