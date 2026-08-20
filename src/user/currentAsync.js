import * as Routes from '../routes/index.js';
import { getStoreValue, setStoreValue } from '../store/index.js';
import formatUser from './lib/formatUser.js';

export default async ({
  context,
  forceUserFetchFromServer = false } = {}) => {

  const sessiontoken = getStoreValue({
    id: 'sproxy',
    context,
  })

  if (!sessiontoken) {
    // console.log('_______currentUserAsync nosessiontoken',)
    return null
  }



  if (!forceUserFetchFromServer) {
    // console.log('_______currentUserAsync no force')
    let object = getStoreValue({
      id: '_gis_parE',
      context,
    })

    if (object) {
      object = JSON.parse(object)
      return formatUser(object)
    }
  }

  const {
    result: object,
    userIsInvalid,
    error } = await Routes.Function({
      path: 'account/me',
      context,
      params: {

      }
    })

  // console.log('_______currentUserAsync',
  //   "result", object,
  //   "userIsInvalid", userIsInvalid,
  //   "error", error,)

  if (error) {
    let object = getStoreValue({
      id: '_gis_parE',
      context,
    })
    if (object) {
      object = JSON.parse(object)
      return formatUser(object)
    }
    else {
      return null
    }
  }

  const value = (object && !userIsInvalid)
    ? JSON.stringify(object)
    : null

  // console.log('_______currentUserAsync value', value)

  setStoreValue({
    id: '_gis_parE',
    value,
    context
  })

  // console.log('_______currentUserAsync didsetcurrentuser', getStoreValue({ id: 'currentuser', context }))

  if (userIsInvalid) {
    // console.log('_______currentUserAsync userisinvalid')
    setStoreValue({
      id: '_l_par3',
      value: null,
      context
    })
    // console.log('_______currentUserAsync didset sessiontoken', getStoreValue({ id: '_l_par3', context }))
  }
  // console.log('_______currentUserAsync returning', object)
  return formatUser(object)
}

