// Comptes crees avant le lancement de la verification d'identite : pas de
// verification retroactive, pour ne pas bloquer les comptes existants
// (dont les comptes admin/test) qui n'ont jamais eu a fournir de document.
export const IDENTITY_VERIFICATION_LAUNCH_DATE = new Date("2026-08-22T16:00:00.000Z");
