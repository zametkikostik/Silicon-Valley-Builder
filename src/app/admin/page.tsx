"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Provider = {
  id: string;
  name: string;
  providerKey: string;
  baseUrl: string | null;
  models: string[];
  isActive: boolean;
  priority: number;
  hasKey: boolean;
  maxTokens?: number | null;
};

const emptyForm = {
  name: "",
  providerKey: "openai",
  apiKey: "",
  baseUrl: "",
  models: "",
  isActive: true,
  priority: 100,
  maxTokens: "",
};

export default function AdminPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/providers");
      if (res.status === 401) {
        setError("Admin only. Sign in as admin.");
        setProviders([]);
        return;
      }
      const data = await res.json();
      setProviders(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(p: Provider) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      providerKey: p.providerKey,
      apiKey: "",
      baseUrl: p.baseUrl || "",
      models: p.models.join(", "),
      isActive: p.isActive,
      priority: p.priority,
      maxTokens: p.maxTokens?.toString() || "",
    });
    setShowForm(true);
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name,
        providerKey: form.providerKey,
        apiKey: form.apiKey || undefined,
        baseUrl: form.baseUrl || null,
        models: form.models.split(",").map((s) => s.trim()).filter(Boolean),
        isActive: form.isActive,
        priority: Number(form.priority) || 100,
        maxTokens: form.maxTokens ? Number(form.maxTokens) : null,
      };
      const url = editingId ? `/api/admin/providers/${editingId}` : "/api/admin/providers";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this provider?")) return;
    const res = await fetch(`/api/admin/providers/${id}`, { method: "DELETE" });
    if (res.ok) await load();
    else setError("Delete failed");
  }

  async function toggleActive(p: Provider) {
    await fetch(`/api/admin/providers/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    await load();
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4 flex justify-between items-center">
        <Link href="/dashboard" className="font-bold text-xl bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
          SVB Admin
        </Link>
        <div className="flex gap-4 text-sm text-zinc-400">
          <span>LLM Providers</span>
          <Link href="/dashboard" className="hover:text-white">← Dashboard</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">LLM Providers</h1>
            <p className="text-zinc-400 text-sm mt-1">Connect any OpenAI-compatible or Anthropic API. Keys are encrypted at rest.</p>
          </div>
          <button onClick={openCreate} className="bg-violet-600 hover:bg-violet-500 px-4 py-2 rounded-xl text-sm font-medium transition">
            + Add Provider
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-950/50 border border-red-800 text-red-300 text-sm rounded-xl p-3">{error}</div>
        )}

        {showForm && (
          <div className="mb-8 bg-zinc-900 border border-zinc-700 rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold text-lg">{editingId ? "Edit Provider" : "New Provider"}</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="OpenAI Production" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500" />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Provider Key</label>
                <select value={form.providerKey} onChange={(e) => setForm({ ...form, providerKey: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500">
                  <option value="openai">openai</option>
                  <option value="anthropic">anthropic</option>
                  <option value="groq">groq</option>
                  <option value="xai">xai</option>
                  <option value="deepseek">deepseek</option>
                  <option value="custom">custom</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-zinc-500 block mb-1">API Key {editingId && "(leave empty to keep current)"}</label>
                <input type="password" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder="sk-..." className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 font-mono" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-zinc-500 block mb-1">Base URL (optional)</label>
                <input value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} placeholder="https://api.openai.com/v1" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-zinc-500 block mb-1">Models (comma-separated)</label>
                <input value={form.models} onChange={(e) => setForm({ ...form, models: e.target.value })} placeholder="gpt-4o, gpt-4o-mini" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500" />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Priority (lower = first)</label>
                <input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500" />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Max Tokens (optional)</label>
                <input type="number" value={form.maxTokens} onChange={(e) => setForm({ ...form, maxTokens: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="active" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
                <label htmlFor="active" className="text-sm">Active</label>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={save} disabled={saving || !form.name} className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-5 py-2 rounded-xl text-sm font-medium">{saving ? "Saving..." : "Save"}</button>
              <button onClick={() => { setShowForm(false); setEditingId(null); }} className="bg-zinc-800 hover:bg-zinc-700 px-5 py-2 rounded-xl text-sm">Cancel</button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-zinc-500">Loading...</p>
        ) : providers.length === 0 ? (
          <p className="text-zinc-500 py-10 text-center">No providers yet. Add one or run prisma db seed.</p>
        ) : (
          <div className="space-y-3">
            {providers.map((p) => (
              <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{p.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded ${p.isActive ? "bg-green-900/60 text-green-300" : "bg-zinc-800 text-zinc-500"}`}>{p.isActive ? "Active" : "Off"}</span>
                    {p.hasKey ? <span className="text-xs text-emerald-500">key set</span> : <span className="text-xs text-amber-500">no key</span>}
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{p.providerKey}{p.baseUrl ? ` · ${p.baseUrl}` : ""} · priority {p.priority}</p>
                  <p className="text-xs text-zinc-600 mt-0.5">{p.models.join(", ") || "no models"}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => toggleActive(p)} className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg">{p.isActive ? "Disable" : "Enable"}</button>
                  <button onClick={() => openEdit(p)} className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg">Edit</button>
                  <button onClick={() => remove(p.id)} className="text-xs bg-red-950/50 hover:bg-red-900/50 text-red-300 px-3 py-1.5 rounded-lg">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-12 grid md:grid-cols-2 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h3 className="font-semibold mb-2">Stripe</h3>
            <p className="text-sm text-zinc-400">Webhook + price IDs in .env. Customer portal ready.</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h3 className="font-semibold mb-2">MCP Servers</h3>
            <p className="text-sm text-zinc-400">Global MCP servers for all projects (Notion, Linear, custom).</p>
          </div>
        </div>
      </main>
    </div>
  );
}
