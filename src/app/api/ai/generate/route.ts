import { NextRequest, NextResponse } from "next/server";
import { generateCodeFiles } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { prompt, projectId, locale = "en", existingFiles, mode = "generate", errorLog } = body;
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "prompt required" }, { status: 400 });
    }
    const result = await generateCodeFiles(prompt, locale, { existingFiles, mode, errorLog });
    if (projectId && session?.user) {
      await prisma.project.update({ where: { id: projectId }, data: { files: result.files } }).catch(() => {});
      await prisma.usageLog.create({
        data: { userId: (session.user as any).id, projectId, provider: "auto", model: "auto", creditsUsed: 1 },
      }).catch(() => {});
    }
    return NextResponse.json(result);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Generation failed" }, { status: 500 });
  }
}
