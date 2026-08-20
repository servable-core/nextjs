import axios from "axios";

const servableAxios = axios.create({
  withCredentials: true,
});

servableAxios.interceptors.request.use((config) => {
  const metadata = config.metadata || {};

  return {
    ...config,
    metadata: {
      ...metadata,
      startedAt: metadata.startedAt || Date.now(),
    },
  };
});

servableAxios.interceptors.response.use(
  (response) => {
    if (response?.config?.metadata) {
      response.config.metadata.durationMs =
        Date.now() - response.config.metadata.startedAt;
    }

    return response;
  },
  (error) => {
    if (error?.config?.metadata) {
      error.config.metadata.durationMs =
        Date.now() - error.config.metadata.startedAt;
    }

    return Promise.reject(error);
  },
);

export default servableAxios;
