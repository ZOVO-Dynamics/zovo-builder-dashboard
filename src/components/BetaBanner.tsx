"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "zovo_beta_banner_dismissed";

export default function BetaBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="flex items-center justify-center gap-3 border-b border-[#D4AF37]/40 bg-[#141414] px-4 py-2 text-sm text-[#D8CBA3]">
      <span>
        <span className="mr-2 rounded-full bg-[#D4AF37]/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-widest text-[#D4AF37]">
          Bêta
        </span>
        ZOVO Builder est en version bêta — vos retours nous aident à l&apos;améliorer.
      </span>
      <button
        onClick={dismiss}
        aria-label="Fermer"
        className="text-[#8A7B54] transition hover:text-[#D4AF37]"
      >
        ✕
      </button>
    </div>
  );
}
