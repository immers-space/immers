import React, { useContext } from 'react'
import { FormattedRelativeTime } from 'react-intl'
import ImmersHandle from '../components/ImmersHandle'
import ProfileIcon from '../components/ProfileIcon'
import SanitizedHTML from '../components/SanitizedHTML'
import './Post.css'
import ServerDataContext from './ServerDataContext'
import { AvatarPreview } from '../components/AvatarPreview'
import { Link } from '@reach/router'

export default function Post ({ id, type, actor, summary, object = {}, published }) {
  const { id: actorId, icon } = actor
  const { context } = object

  const body = getPostBody(object)
  const includeSummaryWithBody = ['Offer'].includes(type)
  if (body) {
    return (
      <div>
        <div className='postHeader'>
          <a className='handle profileLink' href={actorId}>
            <ProfileIcon size='tiny' icon={icon} />
            <ImmersHandle {...actor} showName />
          </a>
          <ImmerLink place={context} />
          <Timestamp id={id} published={published} />
        </div>

        <div className='aesthetic-windows-95-container-indent'>
          {includeSummaryWithBody && <SanitizedHTML className='bodySummary' html={summary} />}
          {body}
        </div>
      </div>
    )
  }
  if (summary) {
    return (
      <div className='postHeader'>
        <SanitizedHTML className='lesserPost' html={summary} />
        <Timestamp id={id} published={published} />
      </div>
    )
  }
  return null
}

function getPostBody (object) {
  const { type, content, url } = object
  switch (type) {
    case 'Note':
      return <SanitizedHTML html={content} />
    case 'Image':
      return <img className='postMedia' src={url} />
    case 'Video':
      return <video className='postMedia' src={url} controls />
    case 'Model':
      return <AvatarPreview avatar={object} icon={object.icon} size='medium' />
  }
  return null
}

function Timestamp ({ published, id }) {
  let timestamp
  try {
    timestamp = new Date(published)
  } catch (ignore) {}
  if (published && timestamp) {
    return (
      <Link className='lesserPost timestamp' to={new URL(id).pathname}>
        <FormattedRelativeTime updateIntervalInSeconds={10} value={(timestamp - Date.now()) / 1000} />
      </Link>
    )
  }
  return null
}

export function ImmerLink ({ place }) {
  const { loggedInUser, domain } = useContext(ServerDataContext)
  const handle = `${loggedInUser}[${domain}]`
  if (!place?.url) {
    return null
  }
  let placeUrl = place.url
  // inject user handle into desintation url so they don't have to type it
  try {
    const url = new URL(placeUrl)
    const hashParams = new URLSearchParams()
    hashParams.set('me', handle)
    url.hash = hashParams.toString()
    placeUrl = url.toString()
  } catch (ignore) {
    /* if fail, leave original url unchanged */
  }
  return placeUrl ? <a href={placeUrl}>{place.name || 'unkown'}</a> : null
}
