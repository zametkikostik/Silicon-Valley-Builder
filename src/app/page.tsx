import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            SVB
          </span>
          <span className="text-sm text-zinc-400">Silicon Valley Builder</span>
        </div>
        <nav className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-zinc-300 hover:text-white transition">
            Dashboard
          </Link>
          <Link href="/auth/signin" className="text-sm bg-violet-600 hover:bg-violet-500 px-4 py-2 rounded-lg transition">
            Sign in
          </Link>
        </nav>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
          Build apps with{" "}
          <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
            AI
          </span>
        </h1>
        <p className="text-xl text-zinc-400 max-w-2xl mb-10">
          Self-hosted open-source alternative to Lovable & Bolt.
          Multi-model AI, WebContainers live preview, Stripe, MCP, Git sync,
          SEO & AI Search — and a real Admin panel for your LLM keys.
        </p>
        <div className="flex gap-4 flex-wrap justify-center">
          <Link
            href="/dashboard"
            className="bg-violet-600 hover:bg-violet-500 text-white font-medium px-8 py-3 rounded-xl text-lg transition shadow-lg shadow-violet-900/40"
          >
            Start Building →
          </Link>
          <a
            href="https://github.com/zametkikostik/Silicon-Valley-Builder"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-zinc-700 hover:border-zinc-500 px-8 py-3 rounded-xl text-lg transition"
          >
            GitHub
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 max-w-5xl w-full">
          {[
            { title: "Multi-Model AI", desc: "OpenAI, Anthropic, Grok, Groq, Ollama — switch in admin" },
            { title: "WebContainers", desc: "Real Node.js sandbox in the browser. Live preview + HMR" },
            { title: "Admin Panel", desc: "Connect any LLM by API key. Priority, rate limits, logs" },
            { title: "Stripe Ready", desc: "Subscriptions + metered credits out of the box" },
            { title: "Git Sync", desc: "GitHub, GitLab, Bitbucket. Push your code anytime" },
            { title: "SEO & AI Search", desc: "Audit, GSC, AI visibility score, one-click fixes" },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 text-left hover:border-violet-700/50 transition"
            >
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-zinc-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-zinc-800 py-6 text-center text-sm text-zinc-500">
        MIT License · Self-host on any VDS · 7 languages
      </footer>
    </div>
  );
}
