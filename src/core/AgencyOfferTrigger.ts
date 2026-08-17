import { prisma } from "@/lib/prisma";
import { computeComplexityTier } from "./ComplexityAnalyzer";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function notifyAgenciesIfComplex(
  projectId: string,
  projectName: string,
  features: string[]
): Promise<void> {
  try {
    const complexityTier = computeComplexityTier(features);
    if (complexityTier !== "complexe") return;

    const agencies = await prisma.marketplaceSeller.findMany({
      where: { isBuyingAgency: true, suspended: false },
      include: { user: { select: { email: true, name: true } } },
    });

    if (agencies.length === 0) return;

    const dashboardUrl = `${process.env.AUTH_URL}/dashboard`;

    for (const agency of agencies) {
      if (resend && agency.user.email) {
        resend.emails.send({
          from: "support@zovo.ca",
          to: agency.user.email,
          subject: `Nouveau projet complexe disponible : ${projectName}`,
          html: `
            <p>Un nouveau projet complexe a été généré sur ZOVO Builder et correspond à votre profil d'agence acheteuse.</p>
            <p><strong>${projectName}</strong> — valeur estimée : projet complexe</p>
            <p>Fonctionnalités détectées : ${features.join(", ") || "aucune"}</p>
            <p><a href="${dashboardUrl}">Voir le projet et faire une offre</a></p>
          `,
        }).catch((err) => {
          console.error("Échec envoi courriel offre agence:", err);
        });
      }
    }

    console.log(
      `[AgencyOfferTrigger] Projet complexe ${projectId} (${projectName}) notifié à ${agencies.length} agence(s).`
    );
  } catch (err) {
    console.error("Erreur notifyAgenciesIfComplex:", err);
  }
}
