/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly WAITLIST_WEBHOOK_URL?: string;
  readonly WAITLIST_WEBHOOK_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
