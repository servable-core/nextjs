import React from "react";
import { Get } from "../routes/index.js";

const useServableRouteGet = (props) => {
  const {
    routeName,
    params = {},
    initialValue,
    forceFetch = false,
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
      params: safeParams,
    });
  }, [routeName, params]);

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
      const { result, userIsInvalid, error } = await Get({
        path: routeName,
        params: {
          ...params,
          ...extraParams,
        },
      });

      setError(error);
      setResult(result);
      setUserIsInvalid(userIsInvalid);
    } catch (e) {
      setResult(e);
    }
    setLoading(false);
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

export default useServableRouteGet;
