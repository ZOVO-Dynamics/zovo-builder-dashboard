"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/marketplace/seller", label: "Espace vendeur" },
  { href: "/marketplace/agency-offers", label: "Offres d'agences" },
  { href: "/account", label: "Mon compte" },
];

export default function MarketplaceLayout({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-[#F5F1E8]">
      <header className="sticky top-0 z-40 border-b border-[#2A2A2E] bg-[#0A0A0C]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/marketplace" className="flex items-center gap-2">
            <span className="text-lg font-semibold tracking-tight">
              ZOVO <span className="text-[#C9A227]">Marketplace</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-4 text-sm">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md border border-[#2A2A2E] px-3 py-1.5 text-[#F5F1E8] transition hover:border-[#C9A227] hover:text-[#E8C34A]"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/dashboard"
              className="rounded-md bg-[#C9A227] px-3 py-1.5 font-medium text-[#0A0A0C] transition hover:bg-[#E8C34A]"
            >
              Mon dashboard
            </Link>
          </nav>

          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden rounded-md border border-[#2A2A2E] px-3 py-1.5 text-sm text-[#F5F1E8]"
          >
            Menu
          </button>
        </div>

        {menuOpen && (
          <nav className="md:hidden flex flex-col gap-2 border-t border-[#2A2A2E] px-4 py-3 text-sm">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-md border border-[#2A2A2E] px-3 py-2 text-[#F5F1E8] transition hover:border-[#C9A227] hover:text-[#E8C34A]"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/dashboard"
              onClick={() => setMenuOpen(false)}
              className="rounded-md bg-[#C9A227] px-3 py-2 font-medium text-[#0A0A0C] transition hover:bg-[#E8C34A]"
            >
              Mon dashboard
            </Link>
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>

      <footer className="border-t border-[#2A2A2E] py-8 text-center text-sm text-[#9B9B95]">
        © {new Date().getFullYear()} ZOVO Dynamics — Marketplace
      </footer>
    </div>
  );
}
