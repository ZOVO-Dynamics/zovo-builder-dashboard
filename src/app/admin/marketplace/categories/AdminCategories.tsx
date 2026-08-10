"use client";

import { useState } from "react";

type Category = {
  id: string;
  name: string;
  slug: string;
  productCount: number;
};

export default function AdminCategories({
  initialCategories,
}: {
  initialCategories: Category[];
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (newName.trim().length < 2) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/marketplace/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la création");

      setCategories((prev) =>
        [...prev, { ...data.category, productCount: 0 }].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );
      setNewName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  }

  async function handleRename(id: string, name: string) {
    if (name.trim().length < 2) return;
    setEditingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/marketplace/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors du renommage");

      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, name: data.category.name, slug: data.category.slug } : c))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setEditingId(null);
    }
  }

  async function handleDelete(id: string) {
    setEditingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/marketplace/categories/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la suppression");

      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setEditingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0C] p-4 text-[#F5F1E8] sm:p-8">
      <h1 className="mb-6 text-2xl font-semibold">
        Catégories <span className="text-[#C9A227]">ZOVO</span>
      </h1>

      <div className="mb-6 flex gap-2">
        <input
          type="text"
          placeholder="Nouvelle catégorie..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          className="flex-1 rounded-md border border-[#2A2A2E] bg-[#16161A] px-3 py-2 text-sm placeholder:text-[#9B9B95] focus:border-[#C9A227] focus:outline-none"
        />
        <button
          onClick={handleCreate}
          disabled={creating}
          className="rounded-md bg-[#C9A227] px-4 py-2 text-sm font-medium text-[#0A0A0C] transition hover:bg-[#E8C34A] disabled:opacity-50"
        >
          {creating ? "..." : "Ajouter"}
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="space-y-2">
        {categories.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-3 rounded-lg border border-[#2A2A2E] bg-[#16161A] p-3"
          >
            <input
              type="text"
              defaultValue={c.name}
              onBlur={(e) => e.target.value !== c.name && handleRename(c.id, e.target.value)}
              disabled={editingId === c.id}
              className="flex-1 rounded-md border border-[#2A2A2E] bg-[#0A0A0C] px-2 py-1 text-sm focus:border-[#C9A227] focus:outline-none disabled:opacity-50"
            />
            <span className="text-xs text-[#9B9B95]">
              {c.productCount} produit{c.productCount === 1 ? "" : "s"}
            </span>
            <button
              onClick={() => handleDelete(c.id)}
              disabled={editingId === c.id || c.productCount > 0}
              title={c.productCount > 0 ? "Impossible : des produits utilisent cette catégorie" : "Supprimer"}
              className="rounded-md border border-red-900/50 px-3 py-1 text-xs text-red-400 transition hover:bg-red-950/20 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Supprimer
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
