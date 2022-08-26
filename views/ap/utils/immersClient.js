import { ImmersClient } from 'immers-client/source/client'
import { useEffect, useState } from 'react'

export const immersClient = new ImmersClient({}, {
  localImmer: window._serverData.domain,
  allowStorage: true
})

export function useProfile () {
  const [profile, setProfile] = useState(immersClient.profile)
  useEffect(() => {
    const onProfileChanged = ({ detail }) => setProfile(detail.profile)
    immersClient.addEventListener('immers-client-connected', onProfileChanged)
    immersClient.addEventListener('immers-client-profile-update', onProfileChanged)
    return () => {
      immersClient.removeEventListener('immers-client-connected', onProfileChanged)
      immersClient.removeEventListener('immers-client-profile-update', onProfileChanged)
    }
  }, [setProfile])
  return profile
}
