import { setStoreValue } from "../store/index.js";
import { setCurrentUser } from "lib/contexts/currentUserContext";
import { setAccessToken } from "./accessTokenStore.js";

export default ({
  context,
  currentuser,
  sessiontoken,
  installationid,
} = {}) => {
  const options = {
    maxAge: 324 * 24 * 60 * 60,
    secure: process.env.NODE_ENV !== "development",
  };

  setStoreValue({
    id: "_platform_cached_user",
    value: JSON.stringify(currentuser),
    context,
    options,
  });

  // Every login route's response now merges in { accessToken, expiresIn, ... } alongside the
  // usual user fields (see backend/main's mint.js / Servable.App.User.mintSessionTokens) - this
  // is the one funnel every sign-in/sign-up/OAuth/magic-link call site already routes through,
  // so capturing it here covers all of them without touching each call site individually.
  // Server-side calls (context present) have no in-memory browser store to write to.
  if (!context && currentuser?.accessToken) {
    setAccessToken(currentuser.accessToken);
  }

  if (sessiontoken) {
    setStoreValue({
      id: "_platform_device_id",
      value: installationid,
      context,
      options,
    });
  }
  try {
    setCurrentUser(currentuser);
  } catch (e) {
    console.error(e);
  }
};
