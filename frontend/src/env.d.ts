/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_DIRECTUS_URL: string;
  readonly PUBLIC_DIRECTUS_TOKEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
