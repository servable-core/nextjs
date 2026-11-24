// @sentry/nextjs is a peer dependency of this package, provided by the consuming app and not installed here: this
// stand-in lets a test import a file that uses it (jest.config.js maps the name here; like lib/account, it is not shipped). A test that needs Sentry's
// behaviour mocks the module with jest.unstable_mockModule.
export const getCurrentScope = () => undefined;
export const getActiveSpan = () => undefined;
