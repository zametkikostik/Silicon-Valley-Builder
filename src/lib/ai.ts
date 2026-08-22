import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText, streamText } from "ai";
import { prisma } from "./prisma";
import { decrypt } from "./encryption";

export type ProviderKey = "openai" | "anthropic" | "groq" | "xai" | "custom";

async function getActiveProviders() {
  const providers = await prisma.llmProvider.findMany({
    where: { isActive: true },
    orderBy: { priority: "asc" },
  });
  return providers.map((p) => ({
    ...p,
    apiKey: decrypt(p.apiKeyEnc),
  }));
}

function createClient(providerKey: string, apiKey: string, baseUrl?: string | null) {
  if (providerKey === "anthropic") {
    return createAnthropic({ apiKey, baseURL: baseUrl || undefined });
  }
  return createOpenAI({
    apiKey,
    baseURL: baseUrl || undefined,
    compatibility: "compatible",
  });
}

export async function runAgent({
  prompt,
  system,
  preferredModel,
}: {
  prompt: string;
  system?: string;
  preferredModel?: string;
}) {
  const providers = await getActiveProviders();
  if (providers.length === 0) {
    const key = process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY || process.env.XAI_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("No LLM providers configured. Add keys in Admin → LLM Providers or .env");
    const client = createOpenAI({ apiKey: key });
    const model = preferredModel || process.env.DEFAULT_MODEL || "gpt-4o-mini";
    return streamText({
      model: client(model),
      system: system || DEFAULT_SYSTEM,
      prompt,
    });
  }

  let lastError: unknown;
  for (const p of providers) {
    if (!p.apiKey) continue;
    try {
      const client = createClient(p.providerKey, p.apiKey, p.baseUrl);
      const model = preferredModel || p.models[0] || "gpt-4o-mini";
      return streamText({
        model: client(model as any),
        system: system || DEFAULT_SYSTEM,
        prompt,
      });
    } catch (e) {
      lastError = e;
      continue;
    }
  }
  throw lastError || new Error("All providers failed");
}

export async function generateCodeFiles(prompt: string, locale = "en") {
  const system = `${DEFAULT_SYSTEM}

Respond ONLY with a valid JSON object of the form:
{
  "files": {
    "src/App.tsx": "...code...",
    "src/index.css": "...",
    "package.json": "...",
    ...
  },
  "message": "short explanation of what was built"
}

Use modern React 19 + TypeScript + Tailwind CSS + Vite.
Include a complete runnable package.json with dependencies.
Language of UI text inside the generated app: ${locale}.
Do not wrap JSON in markdown.`;

  const providers = await getActiveProviders();
  let text = "";

  if (providers.length === 0) {
    const key = process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY || process.env.XAI_API_KEY;
    if (!key) throw new Error("No LLM configured");
    const client = createOpenAI({ apiKey: key });
    const res = await generateText({
      model: client(process.env.DEFAULT_MODEL || "gpt-4o-mini"),
      system,
      prompt,
    });
    text = res.text;
  } else {
    for (const p of providers) {
      if (!p.apiKey) continue;
      try {
        const client = createClient(p.providerKey, p.apiKey, p.baseUrl);
        const res = await generateText({
          model: client((p.models[0] || "gpt-4o-mini") as any),
          system,
          prompt,
        });
        text = res.text;
        break;
      } catch {
        continue;
      }
    }
  }

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI did not return valid JSON files");
  const parsed = JSON.parse(match[0]);
  return parsed as { files: Record<string, string>; message: string };
}

const DEFAULT_SYSTEM = `You are Silicon Valley Builder — an expert full-stack engineer AI.
You generate production-quality React + TypeScript + Tailwind + Vite applications.
Always produce complete, runnable code. Prefer shadcn/ui style components.
Be concise in explanations, maximal in code quality.`;
