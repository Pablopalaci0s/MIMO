/**
 * Única fuente de verdad de qué proveedores OAuth están realmente
 * configurados. Tanto `config.ts` (para registrar o no el provider) como la
 * UI (para mostrar o no el botón — nunca uno que no vaya a funcionar, ver
 * regla 5 de CLAUDE.md) importan esto en vez de leer `process.env` cada uno
 * por su lado.
 */
export const oauthProviderStatus = {
  google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  facebook: Boolean(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET),
};
