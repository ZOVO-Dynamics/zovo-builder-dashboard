import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listVerificationsForReview } from "@/lib/identity/reviewQueue";
import type { IdentityStatus } from "@/lib/identity/types";

interface SessionUserWithAdmin {
  isAdmin?: boolean;
}

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id || !(session.user as SessionUserWithAdmin).isAdmin) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status") as IdentityStatus | null;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));

  const data = await listVerificationsForReview(statusFilter, page);
  return NextResponse.json(data);
}
