import * as Sentry from "@sentry/astro";

Sentry.init({
  dsn: "https://3f294aa83b9f55457771d1066baa84f8@o4511865237012480.ingest.de.sentry.io/4511914186244176",
  enabled: import.meta.env.PROD,
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 0.1,
});
