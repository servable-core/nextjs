import safeStringify from "./safeStringify.js";

const stableStringify = (obj) => {
  if (!obj || typeof obj !== "object") return safeStringify(obj);
  const keys = Object.keys(obj).sort();
  const sorted = {};
  for (const k of keys) sorted[k] = obj[k];
  return safeStringify(sorted);
};

export default stableStringify;
