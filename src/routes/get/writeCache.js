import getStorage from "./getStorage.js";

const writeCache = (
  key,
  value,
  { expireAt, expireInMs, defaultTtlMs = 5 * 60 * 1000 } = {},
) => {
  const storage = getStorage();
  if (!storage) return;
  try {
    let expiresAt;
    if (expireAt instanceof Date) expiresAt = expireAt.getTime();
    else if (typeof expireAt === "string") {
      const t = Date.parse(expireAt);
      if (!Number.isNaN(t)) expiresAt = t;
    } else if (typeof expireAt === "number") {
      expiresAt = expireAt;
    }

    if (expiresAt == null) {
      const ttl =
        typeof expireInMs === "number" && expireInMs > 0
          ? expireInMs
          : defaultTtlMs;
      expiresAt = Date.now() + ttl;
    }

    storage.setItem(key, JSON.stringify({ value, expiresAt }));
  } catch {
    // ignore storage errors
  }
};

export default writeCache;
