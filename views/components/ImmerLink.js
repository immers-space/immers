import { ImmersClient } from 'immers-client'
import React from 'react'
import { immersClient } from '../ap/utils/immersClient'
import './ImmerLink.css'

export function ImmerLink ({ place, destination }) {
  if (place && !destination) {
    destination = ImmersClient.DestinationFromPlace(place)
  }
  if (!destination?.url) {
    return null
  }

  // inject user handle into desintation url so they don't have to type it
  const immerIcon = destination.immer?.icon
  const immerName = destination.immer?.name
  return (
    <a className='immer-link' href={destination.url} onClick={handleImmerLink}>
      {immerIcon && <img src={immerIcon} className='immer-link-icon' />}
      {immerName && <span className='immer-link-immer-name'>{immerName}: </span>}
      <span className='immer-link-destination-name'>{destination.name || 'Unkown'}</span>
    </a>
  )
}

const isAnchor = element => element.tagName === 'A'
/** Inject ?me=handle when navigating to make login easier */
export function handleImmerLink (event) {
  const a = event.nativeEvent.composedPath().find(isAnchor)
  if (!a) {
    return
  }
  if (immersClient.profile && a.origin !== window.location.origin) {
    try {
      const url = new URL(a.href)
      const hashParams = new URLSearchParams()
      hashParams.set('me', immersClient.profile.handle)
      url.hash = hashParams.toString()
      event.preventDefault()
      window.location = url
    } catch (ignore) {
      /* if fail, leave original url unchanged */
    }
  }
}
