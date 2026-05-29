/// <reference types="astro/client" />

interface Window {
  umami?: { track: (event?: string, data?: Record<string, unknown>) => void };
  __umamiLoaded?: boolean;
}

interface ImportMetaEnv {
  readonly PUBLIC_UMAMI_WEBSITE_ID: string;
  readonly PUBLIC_UMAMI_URL: string;
}
