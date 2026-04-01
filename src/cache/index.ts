import NodeCache from 'node-cache';
import { logger } from '../utils/logger';

const TTL = parseInt(process.env.CACHE_TTL_SECONDS ?? '300', 10);

const cache = new NodeCache({ stdTTL: TTL, checkperiod: 60 });

export const cacheService = {
  get<T>(key: string): T | undefined {
    const value = cache.get<T>(key);
    if (value !== undefined) {
      logger.debug(`Cache HIT: ${key}`);
    }
    return value;
  },

  set<T>(key: string, value: T, ttl?: number): void {
    cache.set(key, value, ttl ?? TTL);
    logger.debug(`Cache SET: ${key} (TTL: ${ttl ?? TTL}s)`);
  },

  del(key: string): void {
    cache.del(key);
    logger.debug(`Cache DEL: ${key}`);
  },

  flush(): void {
    cache.flushAll();
    logger.info('Cache flushed');
  },

  stats() {
    return cache.getStats();
  },
};
