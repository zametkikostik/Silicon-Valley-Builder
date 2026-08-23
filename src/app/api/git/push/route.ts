import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pushToRepo, type GitProvider } from "@/lib/git";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { provider, repo, files, branch, message, projectId } = body;
  if (!provider || !repo || !files) {
    return NextResponse.json({ error: "provider, repo, files required" }, { status: 400 });
  }

  const userId = (session.user as any).id as string;
  const account = await prisma.account.findFirst({ where: { userId, provider } });
  const token = account?.access_token || (session.user as any).accessToken;
  if (!token) return NextResponse.json({ error: `Connect ${provider} first` }, { status: 401 });

  try {
    const result = await pushToRepo({
      provider: provider as GitProvider,
      accessToken: token,
      repo,
      branch: branch || "main",
      files,
      message: message || "Update from Silicon Valley Builder",
      projectId: provider === "gitlab" ? repo : undefined,
    });
    if (projectId) {
      await prisma.project.update({
        where: { id: projectId },
        data: { gitRepoUrl: repo, gitProvider: provider },
      }).catch(() => {});
    }
    return NextResponse.json({ ok: true, result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
