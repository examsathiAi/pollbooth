import { redis } from "../../config/redis";
import { logger } from "../interceptors/logger";

export const getCachedOrFetch = async <T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<T> => {
  try {
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    logger.warn(`Redis cache read failed for key: ${key}`, error);
  }

  // If miss or error, fetch fresh data
  const freshData = await fetchFn();

  try {
    // Only cache if there's actual data (don't cache empty results for long)
    if (freshData) {
      await redis.setex(key, ttlSeconds, JSON.stringify(freshData));
    }
  } catch (error) {
    logger.warn(`Redis cache write failed for key: ${key}`, error);
  }

  return freshData;
};
