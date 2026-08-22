import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const providers = await prisma.llmProvider.findMany({ orderBy: { priority: "asc" } });
  const safe = providers.map((p) => ({
    id: p.id,
    name: p.name,
    providerKey: p.providerKey,
    baseUrl: p.baseUrl,
    models: p.models,
    isActive: p.isActive,
    priority: p.priority,
    maxTokens: p.maxTokens,
    hasKey: !!p.apiKeyEnc && p.apiKeyEnc.length > 0,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));
  return NextResponse.json(safe);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, providerKey, apiKey, baseUrl, models, isActive, priority, maxTokens } = body;
  if (!name || !providerKey) {
    return NextResponse.json({ error: "name and providerKey required" }, { status: 400 });
  }

  const provider = await prisma.llmProvider.create({
    data: {
      name,
      providerKey,
      apiKeyEnc: apiKey ? encrypt(apiKey) : "",
      baseUrl: baseUrl || null,
      models: Array.isArray(models) ? models : (models ? String(models).split(",").map((s: string) => s.trim()) : []),
      isActive: !!isActive,
      priority: priority ?? 100,
      maxTokens: maxTokens ?? null,
    },
  });

  return NextResponse.json({
    id: provider.id,
    name: provider.name,
    providerKey: provider.providerKey,
    baseUrl: provider.baseUrl,
    models: provider.models,
    isActive: provider.isActive,
    priority: provider.priority,
    hasKey: !!provider.apiKeyEnc,
  });
}
