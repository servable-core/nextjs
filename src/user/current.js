import { getStoreValue } from '../store/index.js'
import formatUser from './lib/formatUser.js'

export default ({ context } = {}) => {
  const isServerSide = typeof window === 'undefined'
  // console.log('[currentuser]',
  //   'isServerSide',
  //   isServerSide,
  //   'context',
  //   context)


  let currentUser = getStoreValue({
    id: 'currentuser',
    context,
  })

  // console.log('[currentuser] after get',
  //   'isServerSide',
  //   isServerSide,
  //   'currentuser',
  //   currentUser,
  //   'context',
  //   context)



  if (!currentUser) {
    return null
  }

  let object = JSON.parse(currentUser)
  const sessiontoken = getStoreValue({
    id: 'sproxy',
    context,
  })

  if (!sessiontoken) {
    return null
  }

  return formatUser(object)
}
