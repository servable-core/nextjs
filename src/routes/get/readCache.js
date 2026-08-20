import getStorage from "./getStorage.js";

const readCache = (key) => {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const { value, expiresAt } = parsed;
    if (typeof expiresAt === "number" && Date.now() > expiresAt) return null;
    return value;
  } catch {
    return null;
  }
};

export default readCache;
