import { prisma } from "@/lib/prisma";
import type { IdentityStatus } from "./types";

export async function listVerificationsForReview(status: IdentityStatus | null, page: number, pageSize = 20) {
  const where = status ? { identityStatus: status } : {};

  const [verifications, total] = await Promise.all([
    prisma.identityVerification.findMany({
      where,
      orderBy: [{ reviewRequired: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { user: { select: { id: true, email: true, name: true, createdAt: true } } },
    }),
    prisma.identityVerification.count({ where }),
  ]);

  return { verifications, total, page, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
