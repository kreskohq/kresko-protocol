import { getLogger as logger } from '@kreskolabs/lib/meta';

export const getLogger = (name: string, log = !process.env.TEST) => logger(name, process.env.TEST ? false : log);
