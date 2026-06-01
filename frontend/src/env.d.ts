/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_DIRECTUS_URL: string;
  readonly PUBLIC_SITE_URL: string;
  readonly DIRECTUS_TOKEN: string;
  readonly REBUILD_SECRET: string;
  readonly REBUILD_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
