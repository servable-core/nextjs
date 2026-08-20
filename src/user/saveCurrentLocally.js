import { setStoreValue } from "../store/index.js";
import { setCurrentUser } from "lib/contexts/currentUserContext";

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

  // setStoreValue({
  //     id: 'X-Servable-Session-Token-C',
  //     value: 'DEDENozknoze',
  //     context,
  //     options: {
  //         ...options,
  //         httpOnly: true
  //     }
  // })
  // setStoreValue({
  //     id: 'X-Servable-Session-Token-Biz',
  //     value: 'dedezdoezdnozidnzoidnezo',
  //     context,
  //     options: {
  //         ...options,
  //         httpOnly: true
  //     }
  // })

  setStoreValue({
    id: "_gis_parE",
    value: JSON.stringify(currentuser),
    context,
    options,
  });

  if (sessiontoken) {
    setStoreValue({
      id: "_b_par3",
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
