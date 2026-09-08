const stripPort = (host) =>
  String(host || "")
    .split(":")[0]
    .toLowerCase();

// True only in the browser, and only when the current page is a creator's custom domain
// rather than peakub.com/*.peakub.com. NEXT_PUBLIC_URI_CANONICAL sometimes carries a port in
// local dev (e.g. "localhost:4089") which window.location.hostname never does - strip it
// before comparing or every local request misclassifies as a custom domain.
export default () => {
  if (typeof window === "undefined") {
    return false;
  }

  const base = stripPort(process.env.NEXT_PUBLIC_URI_CANONICAL);
  if (!base) {
    return false;
  }

  const hostname = window.location.hostname.toLowerCase();
  return hostname !== base && !hostname.endsWith(`.${base}`);
};
