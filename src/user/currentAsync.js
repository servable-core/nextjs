import * as Routes from '../routes/index.js'

import { getCookie, setCookie } from 'cookies-next'

export default async ({ context, useRemoteIfNecessary = false } = {}) => {
  const { req } = context
  const { cookies: { sessiontoken } } = req

  if (!sessiontoken) {
    return null
  }

  if (sessiontoken && !useRemoteIfNecessary) {
    let data = getCookie('currentuser')
    if (data) {
      data = JSON.parse(data)
      return data
    }
  }

  const { result, userIsRequiredButIsMissing } = await Routes.Function({
    path: 'auth/me',
    context,
    params: {
      sessiontoken,
    }
  })


  setCookie('currentuser',
    (result && !userIsRequiredButIsMissing)
      ? JSON.stringify(result)
      : null,
    { context })

  return result
}
