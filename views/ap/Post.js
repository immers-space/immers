import React from 'react'
import SanitizedHTML from 'react-sanitized-html'
import { FormattedRelativeTime } from 'react-intl'
import ImmersHandle from '../components/ImmersHandle'
import ProfileIcon from '../components/ProfileIcon'
import './Post.css'

export default function Post ({ actor, summary, object = {}, published }) {
  const { id: actorId, name, preferredUsername, icon } = actor
  const { context } = object
  let timestamp
  try {
    timestamp = new Date(published)
  } catch (ignore) {}
  const body = getPostBody(object)
  if (body) {
    return (
      <div>
        <div className='postHeader'>
          <div>
            <div className='tinyIconWrapper'>
              <ProfileIcon className='tinyIcon' icon={icon} />
            </div>
            {name} &ndash;
            {' '}<ImmersHandle id={actorId} preferredUsername={preferredUsername} />
          </div>
          {timestamp && <FormattedRelativeTime updateIntervalInSeconds={10} value={(timestamp - Date.now()) / 1000} />}
        </div>

        <div className='aesthetic-windows-95-container-indent'>
          {body}
        </div>
      </div>
    )
  }
  if (summary) {
    return <SanitizedHTML className='lesserPost' html={summary} />
  }
  return null
}

function getPostBody ({ type, content, url }) {
  switch (type) {
    case 'Note':
      return <SanitizedHTML html={content} />
    case 'Image':
      return <img className='postMedia' src={url} />
    case 'Video':
      return <video className='postMedia' src={url} controls />
  }
  return null
}
