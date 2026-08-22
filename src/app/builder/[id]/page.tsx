"use client";

import { useState, use, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { auditProject, type SeoAuditResult } from "@/lib/seo";

export default function BuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const projectName = searchParams.get("name") || "Untitled";

  const [prompt, setPrompt] = useState("");
  const [files, setFiles] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [streamText, setStreamText] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [tab, setTab] = useState<"chat" | "code" | "preview" | "seo">("chat");
  const [seo, setSeo] = useState<SeoAuditResult | null>(null);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  async function generateFiles() {
    if (!prompt.trim()) return;
    setLoading(true);
    setError("");
    setStreamText("");
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, projectId: id, locale: "en" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setFiles(data.files || {});
      setMessage(data.message || "Done");
      setTab("code");
      setSeo(auditProject(data.files || {}));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function streamChat() {
    if (!prompt.trim()) return;
    setLoading(true);
    setError("");
    setStreamText("");
    setTab("chat");
    abortRef.current = new AbortController();
    try {
      const res = await fetch("/api/ai/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, projectId: id, locale: "en" }),
        signal: abortRef.current.signal,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Stream failed");
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream body");
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("0:")) {
            try {
              const text = JSON.parse(line.slice(2));
              full += text;
              setStreamText(full);
            } catch {
              full += line.slice(2);
              setStreamText(full);
            }
          }
        }
      }
      setMessage(full || "Done");
    } catch (e: any) {
      if (e.name !== "AbortError") setError(e.message);
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  function stopStream() {
    abortRef.current?.abort();
    setLoading(false);
  }

  async function runPreview() {
    if (Object.keys(files).length === 0) return;
    setTab("preview");
    setMessage("Starting WebContainer...");
    try {
      const { mountFiles, startDevServer } = await import("@/lib/webcontainer");
      const wc = await mountFiles(files);
      const url = await startDevServer(wc);
      setPreviewUrl(url);
    } catch (e: any) {
      setError("WebContainers: " + (e.message || "Failed. Use Chrome + HTTPS/localhost."));
    }
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-zinc-400 hover:text-white text-sm">← Back</Link>
          <h1 className="font-semibold">{projectName}</h1>
        </div>
        <div className="flex gap-2">
          {(["chat", "code", "preview", "seo"] as const).map((t) => (
            <button
              key={t}
              onClick={() => (t === "preview" ? runPreview() : setTab(t))}
              className={`px-3 py-1.5 rounded-lg text-sm capitalize transition ${
                tab === t ? "bg-violet-600" : "bg-zinc-800 hover:bg-zinc-700"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {(tab === "chat" || tab === "code") && (
          <div className="w-full md:w-1/2 border-r border-zinc-800 flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {streamText && (
                <div className="bg-zinc-900 rounded-xl p-4 text-sm text-zinc-300 whitespace-pre-wrap font-mono">
                  {streamText}
                  {loading && <span className="animate-pulse">▋</span>}
                </div>
              )}
              {message && !streamText && (
                <div className="bg-zinc-900 rounded-xl p-4 text-sm text-zinc-300 whitespace-pre-wrap">{message}</div>
              )}
              {error && (
                <div className="bg-red-950/50 border border-red-800 rounded-xl p-4 text-sm text-red-300">{error}</div>
              )}
              {tab === "code" && Object.keys(files).length > 0 && (
                <div className="space-y-2">
                  {Object.keys(files).map((path) => (
                    <details key={path} className="bg-zinc-900 rounded-lg">
                      <summary className="px-3 py-2 cursor-pointer text-sm font-mono text-cyan-400">{path}</summary>
                      <pre className="p-3 text-xs overflow-x-auto text-zinc-400 max-h-64">{files[path]}</pre>
                    </details>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-zinc-800 space-y-2">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the app or ask a question..."
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-sm resize-none h-24 focus:outline-none focus:border-violet-500"
                disabled={loading}
              />
              <div className="flex gap-2">
                <button onClick={streamChat} disabled={loading || !prompt.trim()} className="flex-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 py-2.5 rounded-xl text-sm font-medium transition">
                  {loading ? "Streaming..." : "Chat (stream)"}
                </button>
                <button onClick={generateFiles} disabled={loading || !prompt.trim()} className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 py-2.5 rounded-xl text-sm font-medium transition">
                  {loading ? "..." : "Generate App"}
                </button>
                {loading && (
                  <button onClick={stopStream} className="px-4 bg-red-900/50 hover:bg-red-800/50 rounded-xl text-sm">Stop</button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col bg-zinc-900/50">
          {tab === "preview" && (
            <div className="flex-1 flex items-center justify-center">
              {previewUrl ? (
                <iframe src={previewUrl} className="w-full h-full border-0" title="preview" />
              ) : (
                <div className="text-center text-zinc-500 p-8">
                  <p className="mb-4">WebContainers preview</p>
                  <p className="text-sm">Requires Chrome + HTTPS (or localhost with COOP/COEP).</p>
                </div>
              )}
            </div>
          )}
          {tab === "seo" && (
            <div className="p-6 overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">SEO & AI Search Review</h2>
              {seo ? (
                <>
                  <div className="flex gap-6 mb-6">
                    <div className="bg-zinc-900 rounded-xl p-4 text-center">
                      <div className="text-3xl font-bold text-violet-400">{seo.score}</div>
                      <div className="text-xs text-zinc-500">SEO Score</div>
                    </div>
                    <div className="bg-zinc-900 rounded-xl p-4 text-center">
                      <div className="text-3xl font-bold text-cyan-400">{seo.aiVisibilityScore}</div>
                      <div className="text-xs text-zinc-500">AI Visibility</div>
                    </div>
                  </div>
                  <ul className="space-y-2 mb-6">
                    {seo.issues.map((i) => (
                      <li key={i.id} className={`text-sm p-3 rounded-lg border ${
                        i.severity === "error" ? "border-red-800 bg-red-950/30" :
                        i.severity === "warn" ? "border-yellow-800 bg-yellow-950/20" : "border-zinc-700 bg-zinc-900"
                      }`}>
                        <strong>{i.message}</strong>
                        {i.fix && <p className="text-zinc-400 mt-1">Fix: {i.fix}</p>}
                      </li>
                    ))}
                  </ul>
                  <h3 className="font-semibold mb-2">Recommendations</h3>
                  <ul className="list-disc list-inside text-sm text-zinc-400 space-y-1">
                    {seo.recommendations.map((r, idx) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-zinc-500">Generate an app first to run SEO audit.</p>
              )}
            </div>
          )}
          {tab === "chat" && !streamText && Object.keys(files).length === 0 && (
            <div className="flex-1 flex items-center justify-center text-zinc-600">
              <p>Chat (stream) or Generate App on the left</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
