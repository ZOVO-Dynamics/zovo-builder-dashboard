export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black text-[#F0E6D2] px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">Politique de confidentialité</h1>
        <p className="text-sm text-[#B8A87A] mb-10">Dernière mise à jour : 2 août 2026</p>

        <div className="space-y-8 text-[#D8CBA3] leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-[#F0E6D2] mb-2">1. Données collectées</h2>
            <p>Nous collectons votre adresse courriel, votre nom (le cas échéant), le contenu de vos prompts de génération, et les métadonnées associées à vos projets générés (nom, historique de versions) afin de fournir le service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#F0E6D2] mb-2">2. Utilisation des données</h2>
            <p>Vos données sont utilisées pour créer et faire fonctionner votre compte, générer le code de vos projets, gérer votre abonnement, vous envoyer des courriels transactionnels (confirmation de compte, d&apos;abonnement), et améliorer le service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#F0E6D2] mb-2">3. Partage avec des tiers</h2>
            <p>Le contenu de vos prompts est transmis à des fournisseurs tiers de modèles d&apos;intelligence artificielle afin de générer le code de votre application. Les paiements sont traités par Stripe, qui reçoit les informations nécessaires au traitement de la transaction (nous n&apos;avons pas accès à vos données de carte de crédit). Les courriels transactionnels sont envoyés via notre fournisseur d&apos;infrastructure courriel. Nous ne vendons pas vos données personnelles à des tiers à des fins publicitaires.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#F0E6D2] mb-2">4. Conservation des données</h2>
            <p>Nous conservons vos données et vos projets générés aussi longtemps que votre compte est actif. Vous pouvez demander la suppression de votre compte et des données associées à tout moment.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#F0E6D2] mb-2">5. Vos droits</h2>
            <p>Vous pouvez demander l&apos;accès, la correction, l&apos;exportation ou la suppression de vos données personnelles en nous contactant via le support disponible dans l&apos;application.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#F0E6D2] mb-2">6. Sécurité</h2>
            <p>Nous prenons des mesures raisonnables pour protéger vos données, incluant le chiffrement des mots de passe et l&apos;utilisation de connexions sécurisées (HTTPS) pour toutes les communications avec nos serveurs.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#F0E6D2] mb-2">7. Témoins de connexion (cookies)</h2>
            <p>Nous utilisons des témoins de connexion essentiels au fonctionnement du service, notamment pour maintenir votre session connectée. Nous n&apos;utilisons pas de témoins de suivi publicitaire tiers.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#F0E6D2] mb-2">8. Modifications de cette politique</h2>
            <p>Nous pouvons mettre à jour cette politique de confidentialité de temps à autre. Les changements importants seront communiqués aux utilisateurs actifs.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#F0E6D2] mb-2">9. Contact</h2>
            <p>Pour toute question concernant cette politique, contactez-nous via le support disponible dans l&apos;application.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
