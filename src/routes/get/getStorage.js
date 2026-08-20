import hasWindow from "./hasWindow.js";

const getStorage = () =>
  hasWindow() && window.localStorage ? window.localStorage : null;

export default getStorage;
