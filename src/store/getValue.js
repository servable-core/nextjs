import { getCookie } from 'cookies-next'
import { cookies } from 'next/headers'

export default ({ context, id } = {}) => {
    let value
    const isServerSide = typeof window === 'undefined'
    try {
        if (context) {
            const { req, res } = context
            value = getCookie(id, { req, res })
            console.log('____getStoreValue:context')
        } else if (cookies && cookies.get) {
            const a = cookies().get(id)
            value = getCookie(id, { cookies })
            console.log('____getStoreValue:withcookies',
                'value: ',
                value,
                'cookies: ',
                a
                // JSON.stringify(cookies),
            )
        } else {
            value = getCookie(id)
            console.log('____getStoreValue:nocontextnocookies')
        }


        if (isServerSide) {
            console.log('____getStoreValue', 'isServerSide',
                isServerSide, id, value, context, cookies)
        }
    } catch (e) {
        // if (isServerSide) {
        console.error('____getStoreValue:error', e, 'isServerSide',
            isServerSide, id, value, context, cookies)
        // }
    }

    return value
}


// const { req } = context
// const { cookies: { sessiontoken } } = req