import { getLogger as logger } from '@kreskolabs/lib/meta';

export const getLogger = (name: string) => logger(name, !process.env.TEST);
