import { getCookie } from 'cookies-next'

export default async ({ context } = {}) => {
    let sessiontoken
    let installationid
    if (context) {
        const { req, res } = context
        sessiontoken = getCookie('x-servable-session-token', { req, res })
        installationid = getCookie('_b_par3', { req, res })
    } else {
        // sessiontoken = getCookie('x-servable-session-token')
        installationid = getCookie('_b_par3')
    }

    const payload = {
        // ...(req?.headers?.cookie || {}),
        // ...(getCookies({ req, res }) || {}),
        'content-type': 'application/json',
        'Accept': 'application/json',
    }

    if (sessiontoken) {
        payload['X-Servable-Session-Token'] = sessiontoken
    }

    if (installationid) {
        payload['X-Servable-Installation-Id'] = installationid
    }

    return payload
}