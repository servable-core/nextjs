import axios from "axios"
import getHeaders from "./lib/headers.js"
import getConfig from 'next/config'
const { publicRuntimeConfig: { processEnv } } = getConfig()

export default async ({
  path,
  params = {},
  headers = {},
  context,
  version = 'v1',
  serverUrl = processEnv.NEXT_PUBLIC_SERVABLE_BACKEND_URL
}) => {
  try {
    const _headers = await getHeaders({ context })
    const result = await axios({
      method: 'POST',
      url: `${serverUrl}/${version}/${path}`,
      headers: {
        ..._headers,
        ...headers
      },
      params,
    })

    return result.data
  }
  catch (e) {
    console.error(e)
    throw e
  }
}

