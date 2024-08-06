import * as Routes from '../routes/index.js';
import { getStoreValue, setStoreValue } from '../store/index.js';

export default async ({ context, useRemoteIfNecessary = false } = {}) => {
  const sessiontoken = getStoreValue({
    id: 'sessiontoken',
    context,
  })

  if (!sessiontoken) {
    return null
  }

  if (sessiontoken && !useRemoteIfNecessary) {
    let data = getStoreValue({
      id: 'currentuser',
      context,
    })

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

  setStoreValue({
    id: 'currentuser',
    value: (result && !userIsRequiredButIsMissing)
      ? JSON.stringify(result)
      : null,
    context
  })

  return result
}
