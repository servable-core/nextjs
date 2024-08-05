import { getCookie } from 'cookies-next'

export default ({ context = Servable.context } = {}) => {
  let currentUser
  if (!context) {
    console.log('if (context) {')
  }
  if (context) {
    const { req, res } = context
    currentUser = getCookie('currentuser', { req, res })
  } else {
    currentUser = getCookie('currentuser')
  }

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
