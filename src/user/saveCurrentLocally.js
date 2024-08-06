import { setStoreValue } from '../store/index.js'

export default ({ context, payload } = {}) => {
    setStoreValue({
        id: 'currentuser',
        value: payload,
        context
    })
}