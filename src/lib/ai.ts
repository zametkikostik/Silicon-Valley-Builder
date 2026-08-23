import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText, streamText } from "ai";
import { prisma } from "./prisma";
import { decrypt } from "./encryption";

async function getActiveProviders() {
  const providers = await prisma.llmProvider.findMany({ where: { isActive: true }, orderBy: { priority: "asc" } });
  return providers.map((p) => ({ ...p, apiKey: decrypt(p.apiKeyEnc) }));
}

function createClient(providerKey: string, apiKey: string, baseUrl?: string | null) {
  if (providerKey === "anthropic") return createAnthropic({ apiKey, baseURL: baseUrl || undefined });
  return createOpenAI({ apiKey, baseURL: baseUrl || undefined, compatibility: "compatible" });
}

const DEFAULT_SYSTEM = `You are Silicon Valley Builder — an expert full-stack engineer AI.
You generate production-quality React + TypeScript + Tailwind + Vite applications.
Always produce complete, runnable code. Prefer shadcn/ui style components.
When fixing bugs: read the error, locate the file, apply minimal correct patch, return full updated file contents.`;

function filesContext(files?: Record<string, string>) {
  if (!files || Object.keys(files).length === 0) return "";
  const entries = Object.entries(files).slice(0, 40);
  return "\n\nCurrent project files:\n" + entries.map(([path, content]) => `--- ${path} ---\n${content.slice(0, 4000)}`).join("\n\n");
}

export async function runAgent({ prompt, system, preferredModel, files, history }: {
  prompt: string; system?: string; preferredModel?: string;
  files?: Record<string, string>; history?: { role: string; content: string }[];
}) {
  const ctx = filesContext(files);
  const historyBlock = history?.length
    ? "\n\nConversation so far:\n" + history.slice(-12).map((m) => `${m.role}: ${m.content.slice(0, 1500)}`).join("\n")
    : "";
  const fullPrompt = `${prompt}${historyBlock}${ctx}`;
  const sys = system || DEFAULT_SYSTEM;
  const providers = await getActiveProviders();
  if (providers.length === 0) {
    const key = process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY || process.env.XAI_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("No LLM providers configured");
    const client = createOpenAI({ apiKey: key });
    return streamText({ model: client(preferredModel || process.env.DEFAULT_MODEL || "gpt-4o-mini"), system: sys, prompt: fullPrompt });
  }
  let lastError: unknown;
  for (const p of providers) {
    if (!p.apiKey) continue;
    try {
      const client = createClient(p.providerKey, p.apiKey, p.baseUrl);
      return streamText({ model: client((preferredModel || p.models[0] || "gpt-4o-mini") as any), system: sys, prompt: fullPrompt });
    } catch (e) { lastError = e; continue; }
  }
  throw lastError || new Error("All providers failed");
}

export async function generateCodeFiles(prompt: string, locale = "en", opts?: {
  existingFiles?: Record<string, string>; mode?: "generate" | "continue" | "fix"; errorLog?: string;
}) {
  const mode = opts?.mode || "generate";
  const existing = opts?.existingFiles || {};
  const hasExisting = Object.keys(existing).length > 0;
  let task = "";
  if (mode === "fix") {
    task = `SELF-HEAL / FIX MODE. Error log:\n${opts?.errorLog || prompt}\nReturn JSON with files that need to change (full contents).`;
  } else if (mode === "continue" || hasExisting) {
    task = `CONTINUE CODING MODE (like Lovable/Bolt). User request: ${prompt}\nUpdate/add files as needed. Return JSON with updated file map.`;
  } else {
    task = `CREATE NEW APP: ${prompt}`;
  }
  const system = `${DEFAULT_SYSTEM}\n\nRespond ONLY with valid JSON: { "files": { "path": "content" }, "message": "..." }\nReact 19 + TypeScript + Tailwind + Vite. UI language: ${locale}. No markdown.\n${filesContext(existing)}`;
  const providers = await getActiveProviders();
  let text = "";
  async function callModel(client: any, model: string) {
    const res = await generateText({ model: client(model as any), system, prompt: task });
    return res.text;
  }
  if (providers.length === 0) {
    const key = process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY || process.env.XAI_API_KEY;
    if (!key) throw new Error("No LLM configured");
    text = await callModel(createOpenAI({ apiKey: key }), process.env.DEFAULT_MODEL || "gpt-4o-mini");
  } else {
    for (const p of providers) {
      if (!p.apiKey) continue;
      try {
        text = await callModel(createClient(p.providerKey, p.apiKey, p.baseUrl), p.models[0] || "gpt-4o-mini");
        break;
      } catch { continue; }
    }
  }
  if (!text) throw new Error("All providers failed");
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI did not return valid JSON files");
  const parsed = JSON.parse(match[0]);
  const newFiles = parsed.files || {};
  const merged = mode === "generate" && !hasExisting ? newFiles : { ...existing, ...newFiles };
  return { files: merged as Record<string, string>, message: (parsed.message as string) || "Done" };
}
