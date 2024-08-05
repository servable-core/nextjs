import axios from "axios"
import getHeaders from "./lib/headers"
import url from './lib/url'
import DataURIToBlob from "./lib/dataURIToBlob"

export default async ({
    name,
    path,
    params = {},
    headers = {},
    files,
    context,
    version = 'v1'
}) => {
    let _url = name ? name : path
    _url = _url.toLowerCase()
    _url = `${url}/${version}/function/${_url}`
    try {
        const _headers = await getHeaders({ context })

        let result
        if (files && files.length) {
            const form = new FormData()

            for (const file of files) {
                if (file.base64) {
                    const _file = DataURIToBlob(file.base64)
                    form.append("files", _file, file.fileName)
                }
                else if (file.json) {
                    const str = JSON.stringify(file.json)
                    const bytes = new TextEncoder().encode(str)
                    const _file = new Blob([bytes], {
                        type: "application/json;charset=utf-8"
                    });

                    form.append("files", _file, file.fileName)
                    // form.append("files", _file)
                }
                else {
                    form.append("files", file)
                }
            }

            result = await axios.post(_url,
                form,
                {
                    headers: {
                        ..._headers,
                        ...headers,
                        "Content-Type": "multipart/form-data"
                    },
                    params,
                })
        }
        else {
            result = await axios({
                method: 'POST',
                url: _url,
                headers: {
                    ..._headers,
                    ...headers
                },
                params,
            })
        }

        return { result: result.data }
    }
    catch (e) {
        console.error(e)
        const { code } = e
        let userIsRequiredButIsMissing = false
        let hasTechnicalError = true
        let error = {
            code: e.code,
            // title: e.response,
        }

        switch (code) {
            case 209: {
                userIsRequiredButIsMissing = true
            } break
            default: break
        }
        return {
            userIsRequiredButIsMissing,
            hasTechnicalError,
            error
        }
    }
}

