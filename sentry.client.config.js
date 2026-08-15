import * as Sentry from "@sentry/astro";

Sentry.init({
  dsn: "https://3f294aa83b9f55457771d1066baa84f8@o4511865237012480.ingest.de.sentry.io/4511914186244176",
  enabled: import.meta.env.PROD,
  // Tracing pulls a second client chunk onto the landing page. Errors still
  // report; performance spans are not worth the first-load cost here.
  integrations: [],
  tracesSampleRate: 0,
});
