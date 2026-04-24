// 小型 logger 封裝，之後可接 Sentry / analytics
// 依 CLAUDE.md convention，不要直接用 console.log

/* eslint-disable no-console */
const prefix = '[whiteout-coord]';

export const logInfo = (message: string, ...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.info(prefix, message, ...args);
  }
};

export const logError = (message: string, ...args: unknown[]) => {
  console.error(prefix, message, ...args);
};

export const logWarn = (message: string, ...args: unknown[]) => {
  console.warn(prefix, message, ...args);
};
