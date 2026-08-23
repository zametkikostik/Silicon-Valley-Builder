import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listRepos, type GitProvider } from "@/lib/git";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const provider = (req.nextUrl.searchParams.get("provider") || "github") as GitProvider;
  const userId = (session.user as any).id as string;
  const account = await prisma.account.findFirst({ where: { userId, provider } });
  const token = account?.access_token || (session.user as any).accessToken || null;

  if (!token) {
    return NextResponse.json(
      { error: `No ${provider} token. Click Connect with ${provider} first.` },
      { status: 401 }
    );
  }

  try {
    const repos = await listRepos(provider, token);
    return NextResponse.json({ repos, provider });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
