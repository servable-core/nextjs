import { getStoreValue } from '../store/index.js'

export default ({ context } = {}) => {
  const isServerSide = typeof window === 'undefined'
  let currentUser = getStoreValue({
    id: 'currentuser',
    context,
  })

  if (!currentUser) {
    return null
  }

  let object = JSON.parse(currentUser)
  if (!object.sessiontoken) {
    return null
  }

  object = {
    ...object,
    get: (id) => object[id]
  }

  return object
}
