import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error("Stripe webhook signature error:", err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        if (userId && session.subscription) {
          await prisma.subscription.upsert({
            where: { userId },
            create: {
              userId,
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              status: "ACTIVE",
              plan: session.metadata?.plan || "pro",
              creditsRemaining: 5000,
            },
            update: {
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              status: "ACTIVE",
              plan: session.metadata?.plan || "pro",
              creditsRemaining: 5000,
            },
          });
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const existing = await prisma.subscription.findFirst({ where: { stripeCustomerId: customerId } });
        if (existing) {
          const statusMap: Record<string, "ACTIVE" | "CANCELED" | "PAST_DUE" | "FREE"> = {
            active: "ACTIVE", canceled: "CANCELED", past_due: "PAST_DUE", unpaid: "PAST_DUE",
            incomplete: "FREE", incomplete_expired: "CANCELED", trialing: "ACTIVE", paused: "FREE",
          };
          await prisma.subscription.update({
            where: { id: existing.id },
            data: {
              status: statusMap[sub.status] || "FREE",
              stripeSubscriptionId: sub.id,
              currentPeriodEnd: new Date((sub as any).current_period_end * 1000),
            },
          });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await prisma.subscription.updateMany({
          where: { stripeCustomerId: sub.customer as string },
          data: { status: "CANCELED", plan: "free", creditsRemaining: 50 },
        });
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        if (customerId) {
          await prisma.subscription.updateMany({
            where: { stripeCustomerId: customerId, status: "ACTIVE" },
            data: { creditsRemaining: { increment: 2000 } },
          });
        }
        break;
      }
    }
  } catch (e) {
    console.error("Webhook handler error:", e);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
