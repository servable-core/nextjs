// Every consuming Next.js app is expected to provide this module at
// `lib/account/lib/openaccountredirect` (resolved via its own baseUrl-relative
// path config), invoked when the backend reports an invalid/expired session
// (HTTP 209) on a route called with `redirectIfUserRequired: true`. This stub
// only exists so this package's own test suite can resolve and mock the
// import in isolation; it is not shipped as part of the package (see `files`
// in package.json) and consuming apps must supply their own implementation.
export default function openAccountRedirect() {}
