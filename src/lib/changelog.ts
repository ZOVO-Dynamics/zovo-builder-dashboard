import { APP_VERSION } from "./version";

export interface ChangelogEntry {
  version: string;
  title: string;
  items: string[];
}

/**
 * Source unique du journal des mises a jour, partagee entre la page
 * /changelog et la section correspondante affichee en bas de la page
 * d'accueil. Chaque changement de code doit ajouter une entree ici (voir
 * scripts/check-changelog.sh, applique en CI).
 */
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: APP_VERSION,
    title: "Le lien de version du footer défile vers le journal au lieu de changer de page",
    items: [
      "Le lien « v{version} » du footer de la page d’accueil défile désormais vers la section « Journal des mises à jour » plutôt que de naviguer vers /changelog",
      "Cohérent avec les autres liens de navigation ancrée de la page d’accueil",
    ],
  },
  {
    version: "0.1.5",
    title: "Le journal des mises à jour s’affiche désormais sur la page d’accueil",
    items: [
      "Ajout d’une section « Journal des mises à jour » en bas de la page d’accueil, reprenant le contenu de /changelog",
      "Source unique partagée entre la page d’accueil et /changelog pour éviter toute divergence",
    ],
  },
  {
    version: "0.1.4",
    title: "Vérification du gate de vérification d’identité",
    items: [
      "Confirmation que tout compte créé via Google, GitHub ou un autre fournisseur OAuth doit passer par la vérification d’identité, comme un compte créé par email/mot de passe",
      "Ajout de tests verrouillant ce comportement contre une régression future",
    ],
  },
  {
    version: "0.1.3",
    title: 'Le bouton "Essayer ZOVO Builder" mène directement à l’inscription',
    items: ["Le CTA principal de la page d’accueil pointe désormais vers /signup au lieu de /login"],
  },
  {
    version: "0.1.2",
    title: "Chaque mise à jour du code est désormais tracée",
    items: [
      "Nouveau garde-fou en intégration continue : toute modification de code doit incrémenter la version du site et ajouter une entrée à ce journal",
      "Garantit que ce journal des mises à jour reste le reflet fidèle de chaque changement déployé",
    ],
  },
  {
    version: "0.1.1",
    title: "Fiabilisation du vérificateur d’identité",
    items: [
      "Correction d’un plantage du pipeline de vérification sur les documents PDF valides",
      "Les formats de document non décodables sont désormais traités comme illisibles plutôt que de faire échouer la requête",
      "Couverture de tests élargie sur les cas limites de documents invalides (falsification de type, taille, extension trompeuse)",
    ],
  },
  {
    version: "0.1.0",
    title: "Refonte Noir & Or de la landing page",
    items: [
      "Nouvelle charte graphique Noir & Or sur toute la page d’accueil",
      "Globe réseau 3D interactif avec maillage et point de lumière",
      "Arrière-plan animé de particules ambre et halos lumineux",
      "Cartes et badges de section avec finitions dorées au survol",
      "Navigation ancrée (sections) avec défilement fluide, sans hash dans l’URL",
    ],
  },
];
