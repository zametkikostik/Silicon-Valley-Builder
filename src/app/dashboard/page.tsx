"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [projects, setProjects] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function createProject() {
    if (!name.trim()) return;
    setLoading(true);
    const id = crypto.randomUUID();
    const slug = name.toLowerCase().replace(/\s+/g, "-") + "-" + id.slice(0, 6);
    setProjects((p) => [...p, { id, name, slug }]);
    setName("");
    setLoading(false);
    router.push(`/builder/${id}?name=${encodeURIComponent(name)}`);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4 flex justify-between items-center">
        <Link href="/" className="font-bold text-xl bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
          SVB
        </Link>
        <Link href="/admin" className="text-sm text-zinc-400 hover:text-white">
          Admin
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-8">Your Projects</h1>

        <div className="flex gap-3 mb-10">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New project name..."
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-violet-500"
            onKeyDown={(e) => e.key === "Enter" && createProject()}
          />
          <button
            onClick={createProject}
            disabled={loading || !name.trim()}
            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-6 py-3 rounded-xl font-medium transition"
          >
            {loading ? "..." : "Create"}
          </button>
        </div>

        {projects.length === 0 ? (
          <p className="text-zinc-500 text-center py-20">
            No projects yet. Create your first AI app above.
          </p>
        ) : (
          <div className="grid gap-4">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/builder/${p.id}?name=${encodeURIComponent(p.name)}`}
                className="block bg-zinc-900 border border-zinc-800 hover:border-violet-600/50 rounded-xl p-5 transition"
              >
                <h2 className="font-semibold text-lg">{p.name}</h2>
                <p className="text-sm text-zinc-500">{p.slug}</p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
