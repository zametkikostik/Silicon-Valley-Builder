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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { name, providerKey, apiKey, baseUrl, models, isActive, priority, maxTokens } = body;

  const data: any = {};
  if (name !== undefined) data.name = name;
  if (providerKey !== undefined) data.providerKey = providerKey;
  if (apiKey !== undefined && apiKey !== "") data.apiKeyEnc = encrypt(apiKey);
  if (baseUrl !== undefined) data.baseUrl = baseUrl || null;
  if (models !== undefined) {
    data.models = Array.isArray(models)
      ? models
      : String(models).split(",").map((s: string) => s.trim()).filter(Boolean);
  }
  if (isActive !== undefined) data.isActive = !!isActive;
  if (priority !== undefined) data.priority = Number(priority);
  if (maxTokens !== undefined) data.maxTokens = maxTokens ? Number(maxTokens) : null;

  const provider = await prisma.llmProvider.update({ where: { id }, data });
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

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.llmProvider.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
