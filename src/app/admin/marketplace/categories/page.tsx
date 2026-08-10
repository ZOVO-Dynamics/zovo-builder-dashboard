import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import AdminCategories from "./AdminCategories";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/admin/marketplace/categories");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    notFound();
  }

  const categories = await prisma.marketplaceCategory.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });

  const serialized = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    productCount: c._count.products,
  }));

  return <AdminCategories initialCategories={serialized} />;
}
