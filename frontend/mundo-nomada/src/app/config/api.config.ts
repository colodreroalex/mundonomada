interface MundoNomadaRuntimeConfig {
  apiBaseUrl?: string;
  demoMode?: boolean;
}

declare global {
  interface Window {
    __MUNDO_NOMADA_CONFIG__?: MundoNomadaRuntimeConfig;
  }
}

const defaultApiBaseUrl = 'http://localhost/mundonomada/api_php/';
const configuredApiBaseUrl = window.__MUNDO_NOMADA_CONFIG__?.apiBaseUrl?.trim();

/**
 * URL pública de la API. En un servidor se puede reemplazar desde
 * public/runtime-config.js sin incluir contraseñas ni claves privadas.
 */
export const apiBaseUrl = `${(configuredApiBaseUrl || defaultApiBaseUrl).replace(/\/+$/, '')}/`;
