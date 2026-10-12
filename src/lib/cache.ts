export interface CacheEntry {
  data: any;
  timestamp: number;
}

export const dataCache: Record<string, CacheEntry> = {};

export function clearDataCache(type?: string) {
  if (type) {
    delete dataCache[type];
  } else {
    for (const k of Object.keys(dataCache)) {
      delete dataCache[k];
    }
  }
}
