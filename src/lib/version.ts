import packageJson from '../../package.json';

/**
 * Numero de version affiche dans l'UI (footer, changelog).
 * Priorite a NEXT_PUBLIC_APP_VERSION (utile pour overrider en prod/CI),
 * sinon retombe sur la version declaree dans package.json.
 */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || packageJson.version;
