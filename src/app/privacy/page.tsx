export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black text-[#F0E6D2] px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">Politique de confidentialité</h1>
        <p className="text-sm text-[#B8A87A] mb-10">Dernière mise à jour : 5 août 2026</p>

        <div className="space-y-8 text-[#D8CBA3] leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-[#F0E6D2] mb-2">1. Renseignements que nous collectons</h2>
            <p>Nous collectons les renseignements que vous nous fournissez directement (adresse courriel, mot de passe chiffré, prompts soumis au générateur) ainsi que des données d&apos;usage et de navigation (pages visitées, interactions avec le Service) via des outils d&apos;analyse comme Google Analytics et Cloudflare Analytics.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#F0E6D2] mb-2">2. Utilisation des renseignements</h2>
            <p>Nous utilisons ces renseignements pour fournir et améliorer le Service, gérer votre compte et vos abonnements, communiquer avec vous (notifications transactionnelles, support), et analyser l&apos;utilisation du Service afin d&apos;en améliorer la performance et l&apos;expérience utilisateur.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#F0E6D2] mb-2">3. Partage avec des tiers</h2>
            <p>Nous faisons appel à des fournisseurs de services tiers pour certaines fonctions du Service, notamment le traitement des paiements (Stripe) et la génération de code assistée par intelligence artificielle. Ces fournisseurs n&apos;ont accès qu&apos;aux renseignements nécessaires à l&apos;exécution de leurs fonctions et sont tenus de les protéger. Nous ne vendons jamais vos renseignements personnels à des tiers.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#F0E6D2] mb-2">4. Conservation des données</h2>
            <p>Nous conservons vos renseignements personnels aussi longtemps que votre compte est actif. Si vous supprimez votre compte, certaines données peuvent être conservées pendant une période limitée afin de respecter nos obligations comptables et légales, après quoi elles sont supprimées ou anonymisées.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#F0E6D2] mb-2">5. Sécurité</h2>
            <p>Nous mettons en place des mesures raisonnables (chiffrement des mots de passe, accès restreint) pour protéger vos renseignements personnels. Toutefois, aucune méthode de transmission ou de stockage sur Internet n&apos;est totalement sécurisée, et nous ne pouvons garantir une sécurité absolue.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#F0E6D2] mb-2">6. Vos droits</h2>
            <p>Vous avez le droit d&apos;accéder à vos renseignements personnels, de les faire rectifier, ou d&apos;en demander la suppression. Pour exercer ces droits, contactez-nous à support@zovo.ca. Nous répondrons à votre demande dans les délais prévus par la loi applicable.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#F0E6D2] mb-2">7. Témoins (cookies) et analytique</h2>
            <p>Nous utilisons des témoins et des outils d&apos;analyse tiers pour comprendre comment le Service est utilisé et améliorer votre expérience. Vous pouvez configurer votre navigateur pour refuser les témoins, mais certaines fonctionnalités du Service pourraient ne plus fonctionner correctement.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#F0E6D2] mb-2">8. Lois applicables</h2>
            <p>Cette politique est conforme à la Loi sur la protection des renseignements personnels dans le secteur privé du Québec (Loi 25). Si vous résidez dans l&apos;Union européenne, vous bénéficiez également des droits prévus par le Règlement général sur la protection des données (RGPD).</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#F0E6D2] mb-2">9. Modifications de cette politique</h2>
            <p>Nous pouvons modifier cette politique à tout moment. Les changements importants seront communiqués par courriel aux utilisateurs actifs. La poursuite de l&apos;utilisation du Service après une modification constitue une acceptation de la politique révisée.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#F0E6D2] mb-2">10. Contact</h2>
            <p>ZOVO Dynamics. Pour toute question concernant cette politique ou vos renseignements personnels, contactez-nous à support@zovo.ca.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
