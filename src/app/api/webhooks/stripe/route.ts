import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Signature Stripe manquante" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const userId = session.metadata?.userId;
        const planId = session.metadata?.planId;

        if (!userId || !session.subscription) break;

        const subscriptionId = session.subscription as string;

        const subscriptionResponse =
          await stripe.subscriptions.retrieve(subscriptionId);

        const subscription =
          subscriptionResponse as unknown as Stripe.Subscription;

        const item = subscription.items.data[0];

        await prisma.subscription.upsert({
          where: {
            userId,
          },
          create: {
            userId,
            planId: planId || null,
            stripeCustomerId: String(session.customer),
            stripeSubscriptionId: subscription.id,
            stripePriceId: item?.price.id,
            status: subscription.status,
            currentPeriodStart:
              subscription.items.data[0]?.current_period_start
                ? new Date(subscription.items.data[0].current_period_start * 1000)
                : null,
            currentPeriodEnd:
              subscription.items.data[0]?.current_period_end
                ? new Date(subscription.items.data[0].current_period_end * 1000)
                : null,
            cancelAtPeriodEnd:
              subscription.cancel_at_period_end,
          },
          update: {
            planId: planId || null,
            stripeCustomerId: String(session.customer),
            stripeSubscriptionId: subscription.id,
            stripePriceId: item?.price.id,
            status: subscription.status,
            currentPeriodStart:
              subscription.items.data[0]?.current_period_start
                ? new Date(subscription.items.data[0].current_period_start * 1000)
                : null,
            currentPeriodEnd:
              subscription.items.data[0]?.current_period_end
                ? new Date(subscription.items.data[0].current_period_end * 1000)
                : null,
            cancelAtPeriodEnd:
              subscription.cancel_at_period_end,
          },
        });

        await prisma.user.update({
          where:{
            id:userId
          },
          data:{
            plan:"PRO"
          }
        });


        const email = session.customer_details?.email;

        if (email) {
          await resend.emails.send({
            from: "ZOVO <support@zovo.ca>",
            to: email,
            subject: "ZOVO Pro activé",
            html:
              "<h2>Bienvenue dans ZOVO Pro 🚀</h2><p>Votre abonnement est actif.</p>",
          });
        }

        break;
      }


      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {

        const subscription =
          event.data.object as Stripe.Subscription;

        const item = subscription.items.data[0];

        const userId =
          subscription.metadata?.userId;

        if (!userId) break;


        await prisma.subscription.upsert({
          where: {
            stripeSubscriptionId: subscription.id,
          },
          create: {
            userId,
            stripeCustomerId:
              String(subscription.customer),
            stripeSubscriptionId:
              subscription.id,
            stripePriceId:
              item?.price.id,
            status:
              subscription.status,
            currentPeriodStart:
              subscription.items.data[0]?.current_period_start
                ? new Date(subscription.items.data[0].current_period_start * 1000)
                : null,
            currentPeriodEnd:
              subscription.items.data[0]?.current_period_end
                ? new Date(subscription.items.data[0].current_period_end * 1000)
                : null,
            cancelAtPeriodEnd:
              subscription.cancel_at_period_end,
          },
          update: {
            status:
              subscription.status,
            stripePriceId:
              item?.price.id,
            currentPeriodStart:
              subscription.items.data[0]?.current_period_start
                ? new Date(subscription.items.data[0].current_period_start * 1000)
                : null,
            currentPeriodEnd:
              subscription.items.data[0]?.current_period_end
                ? new Date(subscription.items.data[0].current_period_end * 1000)
                : null,
            cancelAtPeriodEnd:
              subscription.cancel_at_period_end,
          },
        });

        break;
      }

      default:
        break;
    }


    return NextResponse.json({
      received: true,
    });


  } catch (error: unknown) {

    console.error(
      "STRIPE WEBHOOK ERROR:",
      error
    );

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error)
      },
      {
        status: 500
      }
    );
  }
}
