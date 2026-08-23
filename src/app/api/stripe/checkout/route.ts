import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createCheckoutSession, stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });

  const body = await req.json();
  const plan = body.plan || "pro";
  const priceId = plan === "team" ? process.env.STRIPE_PRICE_TEAM : process.env.STRIPE_PRICE_PRO;
  if (!priceId) return NextResponse.json({ error: "Price ID not configured in .env" }, { status: 500 });

  const userId = (session.user as any).id as string;
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  const origin = req.headers.get("origin") || process.env.NEXTAUTH_URL || "http://localhost:3000";

  const checkout = await createCheckoutSession({
    customerId: sub?.stripeCustomerId || undefined,
    priceId,
    userId,
    successUrl: `${origin}/billing?success=1`,
    cancelUrl: `${origin}/billing?canceled=1`,
  });
  return NextResponse.json({ url: checkout.url });
}
