import getConfig from 'next/config'
import React from 'react'
import { Function } from '../routes'
const { publicRuntimeConfig: { processEnv } } = getConfig()

const useServableFunction = (props) => {

    const { routeName, parsify, params = {} } = props

    const [isLoading, setLoading] = React.useState(true)
    const [result, setResult] = React.useState(null)

    const [error, setError] = React.useState()


    if (!routeName) {
        return [null, new Error('Please provide a routeName.'), false, 1]
    }

    const _get = async () => {
        setLoading(true)
        setError(null)
        try {
            //ServableTools.Routes.Function
            const struct = await Function({
                path: routeName,
                params: {
                    ...params
                }
            })

            setResult(struct.result)
        } catch (e) {
            setError(e)
        }
        setLoading(false)
    }

    React.useEffect(() => { _get() }, [])

    if (isLoading || error) {
        return [null, error, isLoading,]
    }

    return [result, error, isLoading,]
}

export default useServableFunction