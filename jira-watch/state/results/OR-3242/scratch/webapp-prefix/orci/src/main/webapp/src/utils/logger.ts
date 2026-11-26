const isDev = import.meta.env.DEV;

const noop = (..._args: unknown[]) => {};

export const logger = {
  // eslint-disable-next-line no-console
  debug: isDev ? console.debug.bind(console) : noop,
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};
