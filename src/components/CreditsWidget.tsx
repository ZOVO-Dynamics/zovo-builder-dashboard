"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function CreditsWidget() {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/credits")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setBalance(data?.balance ?? 0))
      .catch(() => setBalance(0));
  }, []);

  if (balance === null) return null;

  return (
    <div className="blueprint-corner mb-6 flex items-center justify-between rounded-lg border border-[#2A2A2E] bg-[#16161A] p-4">
      <div>
        <span className="text-sm text-[#9B9B95]">Crédits disponibles</span>
        <div className="text-2xl font-bold text-[#C9A227]">{balance}</div>
      </div>
      <Link
        href="/pricing"
        className="rounded-lg border border-[#C9A227] px-4 py-2 text-sm font-semibold text-[#E8C34A] transition hover:bg-[#C9A227] hover:text-[#0A0A0C]"
      >
        Acheter des crédits
      </Link>
    </div>
  );
}
