export const logger = (prefix?: string, log = true) => ({
  warn: (...args: any[]) => log && console.warn(prefix, ...args),
  error: (t: boolean, ...args: any[]) => {
    if (!t) throw args[0]
    return log && console.error(prefix, ...args)
  },
  log: (...args: any[]) =>
    log &&
    console.log(
      '\x1b[35m',
      '\x1b[1m',
      `${prefix}:`.padEnd(2),
      '\x1b[0m',
      ...args.flatMap(a => ['\x1b[37m', a, '']),
      '\x1b[0m',
    ),
  success: (...args: any[]) =>
    log &&
    console.log('\x1b[32m', '\x1b[1m', `${prefix}:`, '\x1b[32m', ...args.flatMap(a => ['\x1b[32m', a, '']), '\x1b[0m'),
})
export const getLogger = (name: string, log = !process.env.TEST) => logger(name, process.env.TEST ? false : log)
