import React, { useCallback, useEffect, useState } from 'react'
import ImmersHandle from '../components/ImmersHandle'
import ProfileIcon from '../components/ProfileIcon'
import { ImmerLink } from '../components/ImmerLink'
import './Friends.css'
import EmojiButton from '../components/EmojiButton'
import { immersClient } from './utils/immersClient'

export default function Friends () {
  const [friends, setFriends] = useState([])
  useEffect(() => {
    immersClient.friendsList().then(setFriends)
    const handler = evt => setFriends(evt.detail.friends)
    immersClient.addEventListener('immers-client-friends-update', handler)
    return () => immersClient.removeEventListener('immers-client-friends-update', handler)
  }, [])
  return (
    <div className='aesthetic-windows-95-container-indent'>
      {friends.map(friendStatus => <Friend key={friendStatus.profile.id} {...friendStatus} />)}
    </div>
  )
}

function Friend ({ profile, destination, status, statusString }) {
  const { id: actorId, avatarImage } = profile
  const [actionPending, setActionPending] = useState(false)
  const handleAccept = useCallback(() => {
    setActionPending(true)
    immersClient.addFriend(profile.id).finally(() => setActionPending(false))
  }, [profile.id])
  const handleReject = useCallback(() => {
    setActionPending(true)
    immersClient.removeFriend(profile.id).finally(() => setActionPending(false))
  }, [profile.id])
  let statusContent = null
  switch (status) {
    case 'friend-online':
      statusContent = <span>online at <ImmerLink destination={destination} /></span>
      break
    case 'request-received':
      statusContent = (
        <span className='friendManager'>
          sent you a friend request:
          <EmojiButton emoji='heavy_check_mark' title='Accept' onClick={handleAccept} disabled={actionPending} />
          <EmojiButton emoji='x' title='Reject' onClick={handleReject} disabled={actionPending} />
        </span>
      )
      break
    case 'request-sent':
      statusContent = (
        <span className='friendManager'>
          you sent a friend request:
          <EmojiButton emoji='x' title='Cancel' onClick={handleReject} disabled={actionPending} />
        </span>
      )
      break
    default:
      statusContent = <span>{statusString}</span>
  }
  return (
    <div>
      <div className='postHeader'>
        <a className='handle profileLink' href={actorId}>
          <ProfileIcon size='tiny' icon={avatarImage} />
          <ImmersHandle {...profile} showName />
        </a>
        {statusContent}
      </div>
    </div>
  )
}
