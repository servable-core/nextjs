import { setCookie } from 'cookies-next'
import { cookies } from 'next/headers'

export default ({ context, id, value } = {}) => {
    try {
        if (context) {
            setCookie(id,
                value,
                { context })
        } else {
            setCookie(id,
                value,
                { cookies })
        }
    } catch (e) {
        if (context) {
            setCookie(id,
                value,
                { context })
        } else {
            setCookie(id,
                value,
                { context })
        }
    }
}