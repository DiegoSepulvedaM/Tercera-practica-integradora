import "dotenv/config";

export default {
  app: {
    sentry_dns: process.env.SENTRY_DSN ?? "",
    discord_endpoint: process.env.DISCORD_ENDPOINT ?? "",
  },
  db: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    username: encodeURIComponent(process.env.DB_USERNAME ?? ""),
    password: encodeURIComponent(process.env.DB_PASSWORD ?? ""),
  },
};
