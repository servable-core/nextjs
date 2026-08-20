import { NAMESPACE } from "./constants.js";
import stableStringify from "./stableStringify.js";

const buildCacheKey = ({ serverUrl, version, path, params = {}, cacheKey }) => {
  if (cacheKey) return `${NAMESPACE}${cacheKey}`;
  const base = `${serverUrl}/${version}/${path}`;
  return `${NAMESPACE}${base}?${stableStringify(params)}`;
};

export default buildCacheKey;
