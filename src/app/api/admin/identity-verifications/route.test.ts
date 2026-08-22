import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/identity/reviewQueue", () => ({ listVerificationsForReview: vi.fn() }));

import { auth } from "@/lib/auth";
import { listVerificationsForReview } from "@/lib/identity/reviewQueue";
import { GET } from "./route";

function makeRequest(url = "http://localhost/api/admin/identity-verifications") {
  return new Request(url) as never;
}

describe("GET /api/admin/identity-verifications — permissions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("refuse un visiteur non authentifie", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
    expect(listVerificationsForReview).not.toHaveBeenCalled();
  });

  it("refuse un utilisateur authentifie mais non admin", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user_1", isAdmin: false } } as never);
    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
    expect(listVerificationsForReview).not.toHaveBeenCalled();
  });

  it("autorise un admin", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "admin_1", isAdmin: true } } as never);
    vi.mocked(listVerificationsForReview).mockResolvedValue({
      verifications: [], total: 0, page: 1, totalPages: 1,
    } as never);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    expect(listVerificationsForReview).toHaveBeenCalled();
  });
});
