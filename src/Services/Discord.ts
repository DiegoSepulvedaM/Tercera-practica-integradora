import objectPath from "object-path";
import * as Sentry from "@sentry/node";
import axios from "axios";
import { Frame, SentryRequest } from "../Types/Sentry";
import config from "../config/config";
import { HapiHandler } from "../Types/Hapi";
import logger from "../config/logger";

Sentry.init({
  dsn: config.app.sentry_dns,
  // We recommend adjusting this value in production, or using tracesSampler
  // for finer control
  tracesSampleRate: 1.0,
});

export default class Discord {
  static sentry: HapiHandler = async (request) => {
    try {
      const sentry: SentryRequest = JSON.parse(JSON.stringify(request.payload));

      const { event, project, url } = sentry;

      const title = objectPath.get(event, "title");

      const environment = objectPath.get(event, "environment");

      const trace: Frame[] = objectPath.get(
        event,
        "exception.values.0.stacktrace.frames",
        []
      );

      const contexts = JSON.stringify(
        objectPath.get(event, "contexts", {}),
        null,
        2
      );

      let traceString = "";

      let lastTrace: Frame | undefined;

      lastTrace = Object.values(trace).find((frame) => {
        if (frame.in_app) {
          return true;
        }

        return false;
      });

      if (lastTrace === undefined && trace.length > 0) {
        lastTrace = trace[trace.length - 1];
      }

      logger.info("sentry trace fetched");

      traceString = lastTrace
        ? JSON.stringify(
            {
              filename: lastTrace.filename ?? "",
              lineno: lastTrace.lineno ?? "",
              context_line: lastTrace.context_line ?? "",
            },
            null,
            2
          )
        : "{}";

      const discordMessage = {
        embeds: [
          {
            title: "Sentry Error Report",
            description: `[${title}](${url})`,
            color: 16711680,
            fields: [
              {
                name: "Project",
                value: project,
              },
              {
                name: "Environment",
                value: environment,
              },
              {
                name: "Stack Trace",
                value: `\`\`\`${traceString}\`\`\``,
              },
              {
                name: "context",
                value: `\`\`\`${contexts}\`\`\``,
              },
            ],
            footer: {
              text: "Error reported by Sentry",
            },
          },
        ],
      };

      logger.info("discord message prepared");

      await axios.post(config.app.discord_endpoint, discordMessage);

      logger.info("discord message sent");

      return JSON.stringify({ message: "ok" });
    } catch (err) {
      Sentry.captureException(err);

      throw err;
    }
  };
}
