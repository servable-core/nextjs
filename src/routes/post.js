import axios from "axios"
import getHeaders from "./lib/headers"
import url from './lib/url'

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
            method: 'POST',
            url: `${url}/${version}/${path}`,
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

