import * as Routes from "../routes/index.js";
import { getStoreValue, setStoreValue } from "../store/index.js";
import formatUser from "./lib/formatUser.js";

export default async ({ context, forceUserFetchFromServer = false } = {}) => {
  const sessiontoken = getStoreValue({
    id: "sproxy",
    context,
  });

  if (!sessiontoken) {
    // console.log('_______currentUserAsync nosessiontoken',)
    return null;
  }

  if (!forceUserFetchFromServer) {
    // console.log('_______currentUserAsync no force')
    let object = getStoreValue({
      id: "_platform_cached_user",
      context,
    });

    if (object) {
      object = JSON.parse(object);
      return formatUser(object);
    }
  }

  const {
    result: object,
    userIsInvalid,
    error,
  } = await Routes.Get({
    path: "account/me",
    context,
    params: {},
    // account/me is cached server-side per session token for a few seconds (see that route's
    // own `cache` config) - a caller that explicitly asked to skip the (client-side) cached
    // user via forceUserFetchFromServer means "give me the real, current state," which the
    // server's own cache would silently defeat otherwise (confirmed live 2026-09-07: right
    // after a real validate-email submission flips emailVerified server-side, a
    // forceUserFetchFromServer call landing within that cache window still got the stale
    // pre-flip value back, bouncing the account redirect straight back to mode=validateemail).
    // x-servable-reset-cache is the server's own existing bypass for this exact cache.
    headers: forceUserFetchFromServer ? { "x-servable-reset-cache": "1" } : {},
  });

  // console.log('_______currentUserAsync',
  //   "result", object,
  //   "userIsInvalid", userIsInvalid,
  //   "error", error,)

  if (error) {
    let object = getStoreValue({
      id: "_platform_cached_user",
      context,
    });
    if (object) {
      object = JSON.parse(object);
      return formatUser(object);
    } else {
      return null;
    }
  }

  const value = object && !userIsInvalid ? JSON.stringify(object) : null;

  // console.log('_______currentUserAsync value', value)

  setStoreValue({
    id: "_platform_cached_user",
    value,
    context,
  });

  // console.log('_______currentUserAsync didsetcurrentuser', getStoreValue({ id: 'currentuser', context }))

  if (userIsInvalid) {
    // console.log('_______currentUserAsync userisinvalid')
    // _l_par3 was a legacy auth-state cookie, no longer read anywhere - dead code removed 2026-08-26
  }
  // console.log('_______currentUserAsync returning', object)
  return formatUser(object);
};
