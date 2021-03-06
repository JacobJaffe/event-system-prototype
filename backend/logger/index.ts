import pino from "pino";

const logger = pino({
  level: process.env.NODE_DEBUG || "info",
  prettyPrint: { levelFirst: true },
});

export default logger;
