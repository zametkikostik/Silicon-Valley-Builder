"use client";

import { useState, use, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { auditProject, type SeoAuditResult } from "@/lib/seo";

type ChatMsg = { role: "user" | "assistant"; content: string };

export default function BuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const projectName = searchParams.get("name") || "Untitled";
  const [prompt, setPrompt] = useState("");
  const [files, setFiles] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<ChatMsg[]>([]);
  const [streamText, setStreamText] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [tab, setTab] = useState<"chat" | "code" | "preview" | "seo">("chat");
  const [seo, setSeo] = useState<SeoAuditResult | null>(null);
  const [error, setError] = useState("");
  const [pushStatus, setPushStatus] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const hasFiles = Object.keys(files).length > 0;

  async function callGenerate(mode: "generate" | "continue" | "fix", text: string, errorLog?: string) {
    setLoading(true); setError(""); setStreamText("");
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text, projectId: id, locale: "en", existingFiles: files, mode, errorLog }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setFiles(data.files || {});
      setHistory((h) => [...h, { role: "user", content: text }, { role: "assistant", content: data.message || "Done" }]);
      setTab("code");
      setSeo(auditProject(data.files || {}));
      setPrompt("");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function streamChat() {
    if (!prompt.trim()) return;
    const userText = prompt.trim();
    setLoading(true); setError(""); setStreamText(""); setTab("chat");
    setHistory((h) => [...h, { role: "user", content: userText }]);
    setPrompt("");
    abortRef.current = new AbortController();
    try {
      const res = await fetch("/api/ai/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userText, projectId: id, locale: "en", files, history }),
        signal: abortRef.current.signal,
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || "Stream failed"); }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream body");
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (line.startsWith("0:")) {
            try { const t = JSON.parse(line.slice(2)); full += t; setStreamText(full); }
            catch { full += line.slice(2); setStreamText(full); }
          }
        }
      }
      setHistory((h) => [...h, { role: "assistant", content: full || "Done" }]);
      setStreamText("");
    } catch (e: any) { if (e.name !== "AbortError") setError(e.message); }
    finally { setLoading(false); abortRef.current = null; }
  }

  async function selfFix() {
    await callGenerate("fix", "Fix the project errors", error || prompt || "Runtime or build error");
  }

  async function pushToGit() {
    const raw = localStorage.getItem("svb_git_target");
    if (!raw) { setError("Select a repo in Settings → Git first"); return; }
    if (!hasFiles) { setError("No files to push"); return; }
    setPushStatus("Pushing...");
    try {
      const target = JSON.parse(raw);
      const res = await fetch("/api/git/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: target.provider, repo: target.repo, files, projectId: id, message: `SVB: update ${projectName}` }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Push failed");
      setPushStatus(`Pushed to ${target.repo}`);
    } catch (e: any) { setPushStatus(""); setError(e.message); }
  }

  async function runPreview() {
    if (!hasFiles) return;
    setTab("preview");
    try {
      const { mountFiles, startDevServer } = await import("@/lib/webcontainer");
      const wc = await mountFiles(files);
      setPreviewUrl(await startDevServer(wc));
    } catch (e: any) { setError("WebContainers: " + (e.message || "Failed")); }
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between shrink-0 gap-2 flex-wrap">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-zinc-400 hover:text-white text-sm">← Back</Link>
          <h1 className="font-semibold">{projectName}</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["chat", "code", "preview", "seo"] as const).map((t) => (
            <button key={t} onClick={() => (t === "preview" ? runPreview() : setTab(t))} className={`px-3 py-1.5 rounded-lg text-sm capitalize ${tab === t ? "bg-violet-600" : "bg-zinc-800 hover:bg-zinc-700"}`}>{t}</button>
          ))}
          <button onClick={pushToGit} className="px-3 py-1.5 rounded-lg text-sm bg-zinc-800 hover:bg-zinc-700">{pushStatus || "Push to Git"}</button>
        </div>
      </header>
      <div className="flex-1 flex overflow-hidden">
        {(tab === "chat" || tab === "code") && (
          <div className="w-full md:w-1/2 border-r border-zinc-800 flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {history.map((m, i) => (
                <div key={i} className={`rounded-xl p-3 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-violet-950/40 border border-violet-900/40 ml-8" : "bg-zinc-900 mr-4"}`}>
                  <span className="text-xs text-zinc-500 block mb-1">{m.role}</span>{m.content}
                </div>
              ))}
              {streamText && <div className="bg-zinc-900 rounded-xl p-3 text-sm font-mono mr-4">{streamText}{loading && <span className="animate-pulse">▋</span>}</div>}
              {error && <div className="bg-red-950/50 border border-red-800 rounded-xl p-3 text-sm text-red-300">{error}<button onClick={selfFix} className="ml-3 text-xs underline text-violet-300">Auto-fix</button></div>}
              {tab === "code" && hasFiles && Object.keys(files).map((path) => (
                <details key={path} className="bg-zinc-900 rounded-lg"><summary className="px-3 py-2 cursor-pointer text-sm font-mono text-cyan-400">{path}</summary><pre className="p-3 text-xs overflow-x-auto text-zinc-400 max-h-64">{files[path]}</pre></details>
              ))}
            </div>
            <div className="p-4 border-t border-zinc-800 space-y-2">
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={hasFiles ? "Continue: add dark mode, fix the button..." : "Describe the app..."} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-sm resize-none h-24 focus:outline-none focus:border-violet-500" disabled={loading} />
              <div className="flex gap-2 flex-wrap">
                <button onClick={streamChat} disabled={loading || !prompt.trim()} className="flex-1 min-w-[100px] bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 py-2.5 rounded-xl text-sm font-medium">{loading ? "..." : "Chat"}</button>
                <button onClick={() => callGenerate(hasFiles ? "continue" : "generate", prompt.trim())} disabled={loading || !prompt.trim()} className="flex-1 min-w-[100px] bg-violet-600 hover:bg-violet-500 disabled:opacity-50 py-2.5 rounded-xl text-sm font-medium">{loading ? "..." : hasFiles ? "Continue coding" : "Generate App"}</button>
                {hasFiles && <button onClick={selfFix} disabled={loading} className="px-4 bg-amber-900/40 hover:bg-amber-800/40 py-2.5 rounded-xl text-sm">Fix</button>}
                {loading && <button onClick={() => { abortRef.current?.abort(); setLoading(false); }} className="px-4 bg-red-900/50 rounded-xl text-sm">Stop</button>}
              </div>
              <p className="text-[11px] text-zinc-600">Like Lovable/Bolt: Chat → Continue coding → Fix (self-heal). Multi-turn keeps file context.</p>
            </div>
          </div>
        )}
        <div className="flex-1 flex flex-col bg-zinc-900/50">
          {tab === "preview" && (previewUrl ? <iframe src={previewUrl} className="w-full h-full border-0" title="preview" /> : <div className="flex-1 flex items-center justify-center text-zinc-500">WebContainers preview</div>)}
          {tab === "seo" && <div className="p-6">{seo ? <><div className="flex gap-6 mb-4"><div className="bg-zinc-900 rounded-xl p-4 text-center"><div className="text-3xl font-bold text-violet-400">{seo.score}</div><div className="text-xs text-zinc-500">SEO</div></div><div className="bg-zinc-900 rounded-xl p-4 text-center"><div className="text-3xl font-bold text-cyan-400">{seo.aiVisibilityScore}</div><div className="text-xs text-zinc-500">AI Visibility</div></div></div><ul className="space-y-2">{seo.issues.map((i) => <li key={i.id} className="text-sm p-3 rounded-lg border border-zinc-700">{i.message}</li>)}</ul></> : <p className="text-zinc-500">Generate first</p>}</div>}
          {tab === "chat" && history.length === 0 && !streamText && <div className="flex-1 flex items-center justify-center text-zinc-600 text-center p-8"><div><p className="mb-2">Multi-turn like Lovable / Bolt</p><p className="text-sm">Chat → Continue coding → Fix → Push to Git</p></div></div>}
        </div>
      </div>
    </div>
  );
}
