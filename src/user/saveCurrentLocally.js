import { setCookie } from 'cookies-next'

export default ({ context, payload } = {}) => {
    setCookie('currentuser', payload, context)
}