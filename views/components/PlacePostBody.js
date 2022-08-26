import React from 'react'
import { ImmersClient } from 'immers-client'
import { handleImmerLink, ImmerLink } from './ImmerLink'

export default function PlacePostBody ({ place }) {
  const destination = ImmersClient.DestinationFromPlace(place)
  return (
    <div className='centered'>
      <ImmerLink destination={destination} />
      {destination.previewImage && (
        <a href={destination.url} onClick={handleImmerLink}>
          <img className='postMedia' src={destination.previewImage} />
        </a>
      )}
    </div>
  )
}
