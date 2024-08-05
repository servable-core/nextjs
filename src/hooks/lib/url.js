import getConfig from 'next/config'
const { publicRuntimeConfig, serverRuntimeConfig } = getConfig()
const { processEnv } = publicRuntimeConfig

export default processEnv.NEXT_PUBLIC_BACKEND_SERVER_APP_URL