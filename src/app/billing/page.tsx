"use client";

import { useState } from "react";
import Link from "next/link";

const plans = [
  { id: "free", name: "Free", price: "$0", credits: "50 credits / month", features: ["Basic AI generation", "1 project", "WebContainers preview", "Community support"] },
  { id: "pro", name: "Pro", price: "$29", credits: "5 000 credits / month", features: ["Multi-model AI", "Unlimited projects", "GitHub / GitLab / Bitbucket sync", "SEO & AI Search tools", "Priority models", "Email support"], popular: true },
  { id: "team", name: "Team", price: "$99", credits: "20 000 credits / month", features: ["Everything in Pro", "Shared workspace", "Admin controls", "MCP servers", "SSO (coming)", "Priority support"] },
];

export default function BillingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function checkout(plan: string) {
    if (plan === "free") return;
    setLoading(plan);
    setError("");
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      if (data.url) window.location.href = data.url;
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  }

  async function openPortal() {
    setLoading("portal");
    setError("");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Portal failed");
      if (data.url) window.location.href = data.url;
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4 flex justify-between items-center">
        <Link href="/dashboard" className="font-bold text-xl bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">SVB</Link>
        <div className="flex gap-4 text-sm">
          <Link href="/settings/git" className="text-zinc-400 hover:text-white">Git</Link>
          <Link href="/dashboard" className="text-zinc-400 hover:text-white">Dashboard</Link>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-center mb-2">Billing & Plans</h1>
        <p className="text-zinc-400 text-center mb-10">Pay only for what you use. Credits = AI generations & iterations.</p>
        {error && <div className="mb-6 max-w-lg mx-auto bg-red-950/50 border border-red-800 text-red-300 text-sm rounded-xl p-3 text-center">{error}</div>}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {plans.map((p) => (
            <div key={p.id} className={`rounded-2xl border p-6 flex flex-col ${p.popular ? "border-violet-500 bg-violet-950/20" : "border-zinc-800 bg-zinc-900/60"}`}>
              {p.popular && <span className="text-xs text-violet-300 font-medium mb-2">Most popular</span>}
              <h2 className="text-xl font-bold">{p.name}</h2>
              <div className="mt-2 mb-1"><span className="text-3xl font-bold">{p.price}</span>{p.id !== "free" && <span className="text-zinc-500 text-sm"> / mo</span>}</div>
              <p className="text-sm text-zinc-400 mb-4">{p.credits}</p>
              <ul className="space-y-2 text-sm text-zinc-300 flex-1 mb-6">{p.features.map((f) => (<li key={f} className="flex gap-2"><span className="text-violet-400">✓</span> {f}</li>))}</ul>
              <button onClick={() => checkout(p.id)} disabled={loading !== null || p.id === "free"} className={`w-full py-2.5 rounded-xl text-sm font-medium ${p.id === "free" ? "bg-zinc-800 text-zinc-500" : p.popular ? "bg-violet-600 hover:bg-violet-500" : "bg-zinc-800 hover:bg-zinc-700"}`}>
                {p.id === "free" ? "Current free tier" : loading === p.id ? "Redirecting..." : `Upgrade to ${p.name}`}
              </button>
            </div>
          ))}
        </div>
        <div className="text-center">
          <button onClick={openPortal} disabled={loading !== null} className="text-sm text-zinc-400 hover:text-white underline">Manage subscription (Stripe Customer Portal)</button>
        </div>
      </main>
    </div>
  );
}
