const safeStringify = (obj) => {
  try {
    return JSON.stringify(obj);
  } catch {
    return "";
  }
};

export default safeStringify;
