"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

type Repo = { id: string; name: string; full_name: string; html_url: string };

export default function GitSettingsPage() {
  const [provider, setProvider] = useState<"github" | "gitlab" | "bitbucket">("github");
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState<string | null>(null);
  const [pushing, setPushing] = useState<string | null>(null);

  async function loadRepos() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/git/repos?provider=${provider}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to list repos");
      setRepos(data.repos || []);
      setConnected(provider);
    } catch (e: any) {
      setError(e.message);
      setRepos([]);
    } finally {
      setLoading(false);
    }
  }

  function connectOAuth() {
    signIn(provider, { callbackUrl: "/settings/git" });
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4 flex justify-between items-center">
        <Link href="/dashboard" className="font-bold text-xl bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">SVB</Link>
        <div className="flex gap-4 text-sm">
          <Link href="/billing" className="text-zinc-400 hover:text-white">Billing</Link>
          <Link href="/dashboard" className="text-zinc-400 hover:text-white">Dashboard</Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold mb-2">Git integrations</h1>
        <p className="text-zinc-400 text-sm mb-8">Connect GitHub, GitLab or Bitbucket via OAuth. Then push generated code to any repo.</p>
        <div className="flex gap-2 mb-6">
          {(["github", "gitlab", "bitbucket"] as const).map((p) => (
            <button key={p} onClick={() => setProvider(p)} className={`px-4 py-2 rounded-xl text-sm capitalize ${provider === p ? "bg-violet-600" : "bg-zinc-800 hover:bg-zinc-700"}`}>{p}</button>
          ))}
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
          <h2 className="font-semibold mb-2 capitalize">{provider}</h2>
          <p className="text-sm text-zinc-400 mb-4">Configure OAuth client id/secret in .env, then connect.</p>
          <div className="flex gap-3 flex-wrap">
            <button onClick={connectOAuth} className="bg-violet-600 hover:bg-violet-500 px-4 py-2 rounded-xl text-sm font-medium">Connect with {provider}</button>
            <button onClick={loadRepos} disabled={loading} className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 px-4 py-2 rounded-xl text-sm">{loading ? "Loading..." : "List my repositories"}</button>
          </div>
        </div>
        {error && <div className="mb-4 bg-red-950/50 border border-red-800 text-red-300 text-sm rounded-xl p-3">{error}</div>}
        {repos.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm text-zinc-400 mb-2">Repositories ({connected})</h3>
            {repos.map((r) => (
              <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between">
                <a href={r.html_url} target="_blank" rel="noreferrer" className="font-medium hover:text-violet-300">{r.full_name}</a>
                <button onClick={() => { localStorage.setItem("svb_git_target", JSON.stringify({ provider, repo: r.full_name, id: r.id })); setPushing(r.id); setTimeout(() => setPushing(null), 1500); }} className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg">{pushing === r.id ? "Selected" : "Use in Builder"}</button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
