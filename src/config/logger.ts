import path from "path";
import { createLogger, format, transports } from "winston";

const { combine, timestamp, printf } = format;

// eslint-disable-next-line @typescript-eslint/no-shadow
const myFormat = printf(({ level, message, timestamp }) => {
  return `[${timestamp}][${level}]: ${message}`;
});

const logger = createLogger({
  level: "info",
  format: combine(timestamp(), myFormat),
  transports: [
    //
    // - Write all logs with importance level of `error` or less to `error.log`
    // - Write all logs with importance level of `info` or less to `combined.log`
    //
    new transports.File({
      filename: path.resolve(__dirname, "../../storage/logs/error.log"),
      level: "error",
    }),
    new transports.File({
      filename: path.resolve(__dirname, "../../storage/logs/combined.log"),
    }),
  ],
});

export default logger;
