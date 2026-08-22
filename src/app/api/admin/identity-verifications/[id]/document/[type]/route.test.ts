import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { identityVerification: { findUnique: vi.fn() }, identityDocument: { findUnique: vi.fn() } },
}));
vi.mock("@/lib/identity/security/signedUrl", () => ({ verifyDocumentViewToken: vi.fn() }));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyDocumentViewToken } from "@/lib/identity/security/signedUrl";
import { GET } from "./route";

function makeRequest(token?: string) {
  const url = new URL("http://localhost/api/admin/identity-verifications/v1/document/DRIVERS_LICENSE");
  if (token) url.searchParams.set("token", token);
  return { nextUrl: url } as never;
}

function makeParams(id: string, type: string) {
  return { params: Promise.resolve({ id, type }) };
}

describe("GET .../document/[type] — permissions et URL temporaire", () => {
  beforeEach(() => vi.clearAllMocks());

  it("refuse un utilisateur non-admin, meme avec un jeton valide", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user_1", isAdmin: false } } as never);
    vi.mocked(verifyDocumentViewToken).mockReturnValue(true);

    const res = await GET(makeRequest("valid-token"), makeParams("v1", "DRIVERS_LICENSE"));
    expect(res.status).toBe(403);
    expect(prisma.identityVerification.findUnique).not.toHaveBeenCalled();
  });

  it("refuse un admin sans jeton", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "admin_1", isAdmin: true } } as never);

    const res = await GET(makeRequest(), makeParams("v1", "DRIVERS_LICENSE"));
    expect(res.status).toBe(403);
  });

  it("refuse un admin avec un jeton expire/invalide", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "admin_1", isAdmin: true } } as never);
    vi.mocked(verifyDocumentViewToken).mockReturnValue(false);

    const res = await GET(makeRequest("expired-token"), makeParams("v1", "DRIVERS_LICENSE"));
    expect(res.status).toBe(403);
    expect(prisma.identityVerification.findUnique).not.toHaveBeenCalled();
  });

  it("autorise un admin avec un jeton valide et sert le document dechiffre", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "admin_1", isAdmin: true } } as never);
    vi.mocked(verifyDocumentViewToken).mockReturnValue(true);
    vi.mocked(prisma.identityVerification.findUnique).mockResolvedValue({ userId: "target-user" } as never);
    vi.mocked(prisma.identityDocument.findUnique).mockResolvedValue({
      fileData: Buffer.from("fake-encrypted-bytes"),
      mimeType: "image/jpeg",
    } as never);

    const res = await GET(makeRequest("valid-token"), makeParams("v1", "DRIVERS_LICENSE"));
    expect(res.status).toBe(200);
  });
});
