const INVALID_SERVER_URL_VALUES = new Set(["", "undefined", "null"]);
let hasWarnedAboutRelativeServableUrl = false;

const SERVER_URL_ENV_KEYS = [
  "NEXT_PUBLIC_SERVABLE_BACKEND_URL",
  "NEXT_PUBLIC_BACKEND_URL",
  "SERVABLE_BACKEND_URL",
  "BACKEND_URL",
];

const normalizeServerUrl = (candidate) => {
  if (typeof candidate !== "string") {
    return "";
  }

  const value = candidate.trim();
  if (INVALID_SERVER_URL_VALUES.has(value.toLowerCase())) {
    return "";
  }

  return value.replace(/\/+$/, "");
};

export const resolveServerUrl = (serverUrl) => {
  const fromArgs = normalizeServerUrl(serverUrl);
  if (fromArgs) {
    return fromArgs;
  }

  const runtimeEnv = globalThis?.__env || globalThis?.window?.__env;
  for (const key of SERVER_URL_ENV_KEYS) {
    const fromRuntimeEnv = normalizeServerUrl(runtimeEnv?.[key]);
    if (fromRuntimeEnv) {
      return fromRuntimeEnv;
    }
  }

  const runtimeProcessEnv = globalThis?.window?.process?.env;
  for (const key of SERVER_URL_ENV_KEYS) {
    const fromRuntimeProcess = normalizeServerUrl(runtimeProcessEnv?.[key]);
    if (fromRuntimeProcess) {
      return fromRuntimeProcess;
    }
  }

  for (const key of SERVER_URL_ENV_KEYS) {
    const fromWindow = normalizeServerUrl(globalThis?.window?.[key]);
    if (fromWindow) {
      return fromWindow;
    }
  }

  const fromGlobal = normalizeServerUrl(globalThis?.Servable?.serverUrl);
  if (fromGlobal) {
    return fromGlobal;
  }

  for (const key of SERVER_URL_ENV_KEYS) {
    const fromEnv = normalizeServerUrl(process?.env?.[key]);
    if (fromEnv) {
      return fromEnv;
    }
  }

  return "";
};

const normalizeSegment = (segment) =>
  String(segment || "").replace(/^\/+|\/+$/g, "");

export default ({ serverUrl, version = "v1", path }) => {
  const resolvedServerUrl = resolveServerUrl(serverUrl);
  const normalizedVersion = normalizeSegment(version) || "v1";
  const normalizedPath = normalizeSegment(path);

  if (!resolvedServerUrl) {
    if (
      typeof window !== "undefined" &&
      process.env.NODE_ENV !== "test" &&
      !hasWarnedAboutRelativeServableUrl
    ) {
      hasWarnedAboutRelativeServableUrl = true;
      console.warn(
        "Servable backend URL could not be resolved on the client; falling back to a relative route URL.",
      );
    }

    return `/${normalizedVersion}/${normalizedPath}`;
  }

  return `${resolvedServerUrl}/${normalizedVersion}/${normalizedPath}`;
};
