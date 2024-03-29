import React from 'react'
import { FormattedRelativeTime } from 'react-intl'
import ImmersHandle from '../components/ImmersHandle'
import ProfileIcon from '../components/ProfileIcon'
import SanitizedHTML from '../components/SanitizedHTML'
import './Post.css'
import { Link } from 'react-router-dom'
import ModelPostBody from '../components/ModelPostBody'
import PlacePostBody from '../components/PlacePostBody'
import { handleImmerLink, ImmerLink } from '../components/ImmerLink'
import { ImmersClient } from 'immers-client'

const locationTypes = ['Arrive', 'Leave']
const summaryWithBodyTypes = ['Offer']

export default function Post ({ id, type, actor, summary, object = {}, target, published, settings = {}, handleRemove }) {
  const { id: actorId, icon } = actor
  const { context } = object
  let body

  if (locationTypes.includes(type)) {
    body = getPostBody(target, settings)
  } else {
    body = getPostBody(object, settings, id, handleRemove)
  }

  const includeSummaryWithBody = summaryWithBodyTypes.includes(type)
  if (body) {
    return (
      <article>
        <header className='postHeader'>
          <a className='handle profileLink' href={actorId}>
            <ProfileIcon size='tiny' icon={icon} />
            <ImmersHandle {...actor} showName />
          </a>
          <ImmerLink place={context} />
          <Timestamp id={id} published={published} />
        </header>

        <div className='postBody'>
          {includeSummaryWithBody && <SanitizedHTML className='bodySummary' html={summary} />}
          {body}
        </div>
      </article>
    )
  }
  if (summary) {
    return (
      <div>
        <div className='postHeader'>
          <a className='handle profileLink' href={actorId}>
            <ProfileIcon size='tiny' icon={icon} />
            <ImmersHandle {...actor} showName />
          </a>
          <Timestamp id={id} published={published} />
        </div>
        <div className='lesserPost'>
          <SanitizedHTML className='muted' html={summary} onClick={handleImmerLink} />
        </div>
      </div>
    )
  }
  return null
}

function getPostBody (object, { showAvatarControls, expandLocationPosts }, id, handleRemove) {
  const { type, content, url } = object
  switch (type) {
    case 'Note':
      return <SanitizedHTML html={content} />
    case 'Image':
      return <img className='postMedia' src={ImmersClient.URLFromProperty(url)} />
    case 'Video':
      return <video className='postMedia' src={ImmersClient.URLFromProperty(url)} controls />
    case 'Model':
      return <ModelPostBody model={object} icon={object.icon} size='medium' showControls={showAvatarControls} activityID={id} handleRemove={handleRemove} />
    case 'Place':
      if (expandLocationPosts) {
        return <PlacePostBody place={object} />
      }
      break
  }
  return null
}

function Timestamp ({ published, id }) {
  let timestamp
  try {
    const date = new Date(published)
    timestamp = <FormattedRelativeTime updateIntervalInSeconds={10} value={(date - Date.now()) / 1000} />
  } catch (ignore) {}
  const url = new URL(id)
  if (published && timestamp) {
    return url.origin === window.location.origin
      ? <Link className='muted timestamp' to={new URL(id).pathname}>{timestamp}</Link>
      : <a className='muted timestamp' href={id}>{timestamp}</a>
  }
  return null
}
