"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard", label: "Generer" },
  { href: "/dashboard#projects", label: "Projets" },
  { href: "/dashboard#usage", label: "Usage" },
  { href: "/pricing", label: "Pricing" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center border-b border-[#C9A227]/25 bg-[#0A0A0C] p-4 md:hidden">
        <button
          onClick={() => setOpen(true)}
          className="absolute left-4 rounded-md border border-[#C9A227]/40 bg-[#16161A] p-2 text-[#F5F1E8]"
          aria-label="Ouvrir le menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <Link href="/" style={{ fontFamily: "var(--font-mono, monospace)" }} className="text-lg tracking-tight text-[#C9A227]">
          ZOVO
        </Link>
      </div>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/70 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 min-h-screen border-r border-[#C9A227]/25 bg-[#0A0A0C] p-6 text-[#F5F1E8] transition-transform duration-200 md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ fontFamily: "var(--font-body, inherit)" }}
      >
        <Link href="/" style={{ fontFamily: "var(--font-mono, monospace)" }} className="hidden text-lg tracking-tight text-[#C9A227] md:block">
          ZOVO
        </Link>

        <nav className="mt-10 space-y-1 md:mt-10">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "border-[#C9A227]/60 bg-[#1A1508] text-[#E8C34A]"
                    : "border-transparent text-[#F5F1E8] hover:border-[#C9A227]/30 hover:bg-[#16161A]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-10 flex gap-3 px-3 text-xs text-[#6B6560]">
          <Link href="/terms" className="hover:text-[#9B9B95]">Conditions</Link>
          <Link href="/privacy" className="hover:text-[#9B9B95]">Confidentialite</Link>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="mt-4 w-full rounded-md border border-[#2A2A2E] px-3 py-2 text-left text-sm text-[#9B9B95] transition-colors hover:border-[#C9A227]/30 hover:text-[#F5F1E8]"
        >
          Se deconnecter
        </button>
      </aside>
    </>
  );
}
