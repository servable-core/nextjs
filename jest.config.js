import * as dotenv from 'dotenv'
dotenv.config()

export default ({
  "testRegex": "((\\.|/*.)(test))\\.js?$",
  "transform": {},
  "testTimeout": 700000,
  "testEnvironment": "jest-environment-jsdom",
  // Consuming Next.js apps resolve bare "lib/*" imports (e.g.
  // "lib/account/lib/openaccountredirect") via their own baseUrl-relative
  // path config. modulePaths mirrors that for this package's own tests so
  // the stub under ./lib stands in for the consumer-provided module.
  "modulePaths": ["<rootDir>"]
})
