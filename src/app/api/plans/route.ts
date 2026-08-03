import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveDiscount, computeDiscountedPrice } from "@/lib/discounts";

export async function GET() {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      include: { prices: true },
    });

    const enriched = await Promise.all(
      plans.map(async (plan) => {
        const discount = await getActiveDiscount(plan.tier);

        const prices = plan.prices
          .sort((a, b) => a.priceCents - b.priceCents)
          .map((price) => ({
            billingInterval: price.billingInterval,
            priceCents: price.priceCents,
            isDefault: price.isDefault,
            discountedPriceCents: discount
              ? computeDiscountedPrice(price.priceCents, discount.percentOff)
              : null,
          }));

        return {
          id: plan.id,
          name: plan.name,
          internalName: plan.internalName,
          tier: plan.tier,
          currency: plan.currency,
          discountPercent: discount?.percentOff ?? null,
          generationsLimit: plan.generationsLimit,
          features: plan.features,
          prices,
        };
      })
    );

    return NextResponse.json({ plans: enriched.filter((p) => p.prices.length > 0) });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
