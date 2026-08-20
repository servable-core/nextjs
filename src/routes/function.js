import DataURIToBlob from "./lib/dataURIToBlob.js";
import requestRoute from "./lib/requestRoute.js";

const SERVABLE_BACKEND_VERSION =
  process.env.NEXT_PUBLIC_SERVABLE_BACKEND_VERSION || "v1";
const SERVABLE_TIMEOUT = Number(
  process.env.NEXT_PUBLIC_SERVABLE_TIMEOUT ||
    process.env.NEXT_PUBLIC_SERVABLE_TIMEOUT_MS ||
    15000,
);

const ServableFunction = async (props) => {
  const {
    name,
    path,
    params = {},
    headers = {},
    traceparent,
    baggage,
    redirectIfUserRequired = false,
    files = [],
    context,
    version = SERVABLE_BACKEND_VERSION,
    serverUrl = process.env.NEXT_PUBLIC_SERVABLE_BACKEND_URL,
    timeout = SERVABLE_TIMEOUT,
    signal,
    // retry options
    retryCount,
    retryInitialDelayMs,
    retryBackoffFactor,
    retryMaxDelayMs,
    retryOnStatuses,
    retryOnNetworkError,
  } = props;

  let functionPath = name ? name : path;
  functionPath = functionPath.toLowerCase();

  let data;
  if (files && files.length) {
    const form = new FormData();
    for (const file of files) {
      if (file.base64) {
        const serializedFile = DataURIToBlob(file.base64);
        form.append("files", serializedFile, file.fileName);
      } else if (file.json) {
        const serializedJson = JSON.stringify(file.json);
        const jsonBytes = new TextEncoder().encode(serializedJson);
        const serializedFile = new Blob([jsonBytes], {
          type: "application/json;charset=utf-8",
        });

        form.append("files", serializedFile, file.fileName);
      } else {
        form.append("files", file, file.fieldName ? file.fieldName : null);
      }
    }

    data = form;
  }

  return requestRoute({
    method: "FUNCTION",
    transportMethod: "POST",
    retryMethod: "FUNCTION",
    path: `function/${functionPath}`,
    params,
    headers,
    traceparent,
    baggage,
    context,
    version,
    serverUrl,
    timeout,
    redirectIfUserRequired,
    signal,
    data,
    retryCount,
    retryInitialDelayMs,
    retryBackoffFactor,
    retryMaxDelayMs,
    retryOnStatuses,
    retryOnNetworkError,
  });
};

export default ServableFunction;
