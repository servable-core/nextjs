import React from "react";
import { Function, Get } from "../routes/index.js";

const useServableFunction = (props) => {
  const {
    routeName,
    params = {},
    initialValue,
    forceFetch = false,
    httpMethod = "function",
    // GET-specific caching options
    useCache = false,
    cacheKey,
    cacheExpireInMs,
    cacheExpireAt,
    cachePolicy = "cache-first", // 'cache-only' | 'cache-first' | 'network-only'
    // Retry options
    retryCount,
    retryInitialDelayMs,
    retryBackoffFactor,
    retryMaxDelayMs,
    retryOnStatuses,
    retryOnNetworkError,
    // Optional additional dependencies that should trigger a refetch
    deps = [],
  } = props;

  const [isLoading, setLoading] = React.useState(!initialValue);
  const [result, setResult] = React.useState(initialValue);
  const [userIsInvalid, setUserIsInvalid] = React.useState(null);

  const [error, setError] = React.useState();

  if (!routeName) {
    return [null, new Error("Please provide a routeName."), false];
  }

  const requestSignature = React.useMemo(() => {
    const safeParams =
      params && typeof params === "object" ? params : { value: params };

    return JSON.stringify({
      routeName,
      httpMethod,
      params: safeParams,
    });
  }, [routeName, httpMethod, params]);

  const hasMountedRef = React.useRef(false);

  const load = async ({ forceReload = false, extraParams = {} } = {}) => {
    if (result && !forceFetch && !forceReload) {
      setLoading(false);
      setError(null);
      return;
    }

    // if (initialValue && !forceFetch) {
    //   setResult(initialValue)
    //   setLoading(false)
    //   setError(null)
    //   return
    // }

    setResult(null);
    setLoading(true);
    setError(null);
    try {
      if (httpMethod === "function") {
        const {
          result: _result,
          userIsInvalid: _u,
          error: _err,
        } = await Function({
          path: routeName,
          params: { ...params, ...extraParams },
          retryCount,
          retryInitialDelayMs,
          retryBackoffFactor,
          retryMaxDelayMs,
          retryOnStatuses,
          retryOnNetworkError,
        });
        setError(_err);
        setResult(_result);
        setUserIsInvalid(_u);
        setLoading(false);
        return;
      }

      // httpMethod === 'get'
      if (cachePolicy === "cache-only") {
        const { result: _cached } = await Get({
          path: routeName,
          params: { ...params, ...extraParams },
          useCache,
          cacheKey,
          cacheExpireInMs,
          cacheExpireAt,
          preferCache: true,
          forceNetwork: false,
          retryCount,
          retryInitialDelayMs,
          retryBackoffFactor,
          retryMaxDelayMs,
          retryOnStatuses,
          retryOnNetworkError,
        });
        setResult(_cached || null);
        setError(null);
        setLoading(false);
        return;
      }

      if (cachePolicy === "cache-first") {
        // 1) Try cache immediately
        const first = await Get({
          path: routeName,
          params: { ...params, ...extraParams },
          useCache,
          cacheKey,
          cacheExpireInMs,
          cacheExpireAt,
          preferCache: true,
          forceNetwork: false,
          retryCount,
          retryInitialDelayMs,
          retryBackoffFactor,
          retryMaxDelayMs,
          retryOnStatuses,
          retryOnNetworkError,
        });

        if (first && first.result != null) {
          setResult(first.result);
          setError(null);
          setLoading(false);
          // 2) Background refresh from network
          Get({
            path: routeName,
            params: { ...params, ...extraParams },
            useCache,
            cacheKey,
            cacheExpireInMs,
            cacheExpireAt,
            preferCache: false,
            forceNetwork: true,
            retryCount,
            retryInitialDelayMs,
            retryBackoffFactor,
            retryMaxDelayMs,
            retryOnStatuses,
            retryOnNetworkError,
          })
            .then(({ result: fresh }) => {
              if (fresh != null) setResult(fresh);
            })
            .catch(() => {
              /* silent */
            });
          return;
        }

        // No cache; go to network
        const {
          result: fresh,
          userIsInvalid: _u,
          error: _err,
        } = await Get({
          path: routeName,
          params: { ...params, ...extraParams },
          useCache,
          cacheKey,
          cacheExpireInMs,
          cacheExpireAt,
          preferCache: false,
          forceNetwork: false,
          retryCount,
          retryInitialDelayMs,
          retryBackoffFactor,
          retryMaxDelayMs,
          retryOnStatuses,
          retryOnNetworkError,
        });
        setError(_err);
        setResult(fresh);
        setUserIsInvalid(_u);
        setLoading(false);
        return;
      }

      // network-only
      const {
        result: netResult,
        userIsInvalid: _u,
        error: _err,
      } = await Get({
        path: routeName,
        params: { ...params, ...extraParams },
        useCache, // still write to cache for future loads
        cacheKey,
        cacheExpireInMs,
        cacheExpireAt,
        preferCache: false,
        forceNetwork: true,
        retryCount,
        retryInitialDelayMs,
        retryBackoffFactor,
        retryMaxDelayMs,
        retryOnStatuses,
        retryOnNetworkError,
      });
      setError(_err);
      setResult(netResult);
      setUserIsInvalid(_u);
      setLoading(false);
    } catch (e) {
      setResult(e);
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      load();
      return;
    }

    load({ forceReload: true });
  }, [requestSignature, ...deps]);

  const reload = ({ forceReload = true, params: extraParams = {} } = {}) =>
    load({ forceReload, extraParams });
  return [result, error, isLoading, userIsInvalid, reload];
};

export default useServableFunction;
