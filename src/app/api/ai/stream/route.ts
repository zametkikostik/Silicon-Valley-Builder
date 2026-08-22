import { NextRequest } from "next/server";
import { runAgent } from "@/lib/ai";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { prompt, projectId, locale = "en", system } = body;

    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "prompt required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const result = await runAgent({
      prompt,
      system:
        system ||
        `You are Silicon Valley Builder. Help the user build apps. Language preference: ${locale}. Be concise and actionable.`,
    });

    const response = result.toDataStreamResponse();

    if (session?.user && projectId) {
      prisma.usageLog
        .create({
          data: {
            userId: (session.user as any).id,
            projectId,
            provider: "auto",
            model: "auto",
            creditsUsed: 1,
          },
        })
        .catch(() => {});
    }

    return response;
  } catch (e: any) {
    console.error("Stream error:", e);
    return new Response(JSON.stringify({ error: e.message || "Stream failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
