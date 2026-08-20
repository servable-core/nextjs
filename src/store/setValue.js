import { setCookie } from 'cookies-next'

export default ({
    context,
    id,
    value,
    options = {} } = {}) => {
    try {
        const isServerSide = typeof window === 'undefined'

        if (context) {
            //console.log('LOGNAK', '_______setStoreValue for context', id, value)
            setCookie(id,
                value,
                {
                    req: context.req,
                    res: context.res,
                    ...options
                })
        } else if (isServerSide) {
            //console.log('LOGNAK', '_______setStoreValue isserverside', id, value)
            const cookies = (require('next/headers')).cookies
            if (cookies && cookies.get) {
                //console.log('LOGNAK', '_______setStoreValue for context: cookies', id, value)
                setCookie(id,
                    value,
                    {
                        cookies,
                        ...options
                    })
            }
        }
        else {
            //console.log('LOGNAK', '_______setStoreValue no context no server side', id, value)
            setCookie(id,
                value, {
                ...options
            })
        }
    } catch (e) {
        if (context) {
            setCookie(id,
                value,
                {
                    req: context.req,
                    res: context.res,
                    ...options
                })
        } else {
            setCookie(id,
                value,
                {
                    req: context.req,
                    res: context.res,
                    ...options
                })
        }
    }
}