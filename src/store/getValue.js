import { getCookie } from 'cookies-next'

export default ({ context, id } = {}) => {
    let value
    const isServerSide = typeof window === 'undefined'
    //console.log('LOGNAK', '____getStoreValue: enter', id)
    try {
        if (context) {
            //console.log('LOGNAK', '____getStoreValue: context')
            const { req, res } = context
            value = getCookie(id, { req, res })
            // //console.log('LOGNAK', '____getStoreValue:context')
        } else if (isServerSide) {
            const cookies = (require('next/headers')).cookies
            //console.log('LOGNAK', '____getStoreValue: no context, cookies', cookies, 'cookies.get', Object.keys(cookies))
            if (cookies) {
                // const a = cookies().get(id)
                value = getCookie(id, { cookies })
                //console.log('LOGNAK', '____getStoreValue:withcookies id',
                // id,
                // 'value: ',
                // value,
                // 'cookies: ',
                // // a
                // // JSON.stringify(cookies),
                // )
            }
        } else {
            value = getCookie(id)
            //console.log('LOGNAK', '____getStoreValue:nocontextnocookies')
        }


        if (isServerSide) {
            // //console.log('LOGNAK', '____getStoreValue', 'isServerSide',
            // isServerSide, id, value, context, cookies)
        }
    } catch (e) {
        console.error('LOGNAK', '____getStoreValue:error', e, 'isServerSide',
            isServerSide, id, value, context)
    }

    return value
}
