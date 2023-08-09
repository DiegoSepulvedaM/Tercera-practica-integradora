import Hapi from "@hapi/hapi";
import * as Sentry from "@sentry/node";
import routes from "./routes";
import config from "./config/config";

Sentry.init({
  dsn: config.app.sentry_dns,
  // We recommend adjusting this value in production, or using tracesSampler
  // for finer control
  tracesSampleRate: 1.0,
});

const init = async () => {
  const server = Hapi.server({
    host: "localhost",
    port: 8000,
  });

  routes.forEach((route) => {
    server.route(route);
  });

  await server.start();
  console.log("Server running on %s", server.info.uri);
};

try {
  init();
} catch (err) {
  Sentry.captureException(err);
  process.exit(1);
}
