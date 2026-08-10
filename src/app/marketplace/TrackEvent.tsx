"use client";

import { useEffect, useRef } from "react";

type EventType = "VIEW" | "CLICK" | "SPONSORED_IMPRESSION" | "SPONSORED_CLICK";

// Envoie un événement analytics une seule fois au montage (VIEW/impression).
// N'affiche rien, n'affecte jamais le rendu — silencieux en cas d'échec
// réseau, une perte de log analytics ne doit jamais casser la page.
export default function TrackEvent({
  productId,
  type,
  sponsoredPlacementId,
}: {
  productId: string;
  type: EventType;
  sponsoredPlacementId?: string;
}) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;

    fetch("/api/marketplace/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, type, sponsoredPlacementId }),
    }).catch(() => {
      // silencieux : un échec de log analytics ne doit jamais perturber l'utilisateur
    });
  }, [productId, type, sponsoredPlacementId]);

  return null;
}
