import axios from "axios"
import getHeaders from "./lib/headers.js"
import url from './lib/url.js'

export default async ({
  path,
  params = {},
  headers = {},
  context,
  version = 'v1'
}) => {
  try {
    const _headers = await getHeaders({ context })
    const result = await axios({
      method: 'GET',
      url: `${url}/${version}/${path}`,
      headers: {
        ..._headers,
        ...headers
      },
      ...params,
    })

    return result
  }
  catch (e) {
    console.error(e)
    return {
      status: 'failed',
      error: e
    }
  }
}

