import { getCookie } from 'cookies-next'

export default async ({ context } = {}) => {
    let sessiontoken
    if (context) {
        const { req, res } = context
        sessiontoken = getCookie('sessiontoken', { req, res })
    } else {
        sessiontoken = getCookie('sessiontoken')
    }

    return sessiontoken ? {
        'content-type': 'application/json',
        'Accept': 'application/json',
        'sessiontoken': sessiontoken
    }
        :
        {
            'content-type': 'application/json',
            'Accept': 'application/json'
        }
}