import React, { useContext, useEffect, useState } from 'react'
import ImmersHandle from '../components/ImmersHandle'
import ProfileIcon from '../components/ProfileIcon'
import { ImmerLink } from './Post'
import ServerDataContext from './ServerDataContext'
import './Friends.css'
import EmojiButton from './EmojiButton'

export default function Friends ({ iri }) {
  const [items, setItems] = useState([])
  const { token } = useContext(ServerDataContext)
  useEffect(() => {
    window.fetch(iri, {
      headers: {
        Accept: 'application/activity+json',
        Authorization: `Bearer ${token}`
      }
    }).then(res => res.json())
      .then(collectionPage => {
        setItems(items.concat(collectionPage.orderedItems))
      })
  }, [iri])
  return (
    <div className='aesthetic-windows-95-container-indent'>
      {items.map(item => <Friend key={item.id} {...item} />)}
    </div>
  )
}

// {items.map(item => <Friend key={item.actor.id} {...item} />)}
function Friend ({ type, actor, summary, object = {}, target = {}, published }) {
  const { id: actorId, icon } = actor
  // const { context } = object
  let location = null
  switch (type) {
    case 'Arrive':
      location = <span>Online at <ImmerLink place={target} /></span>
      break
    case 'Leave':
      location = 'Offline'
      break
    case 'Follow':
      location = (
        <span className='friendManager'>
          sent you a friend request:

        </span>
      )
      break
  }
  return (
    <div>
      <div className='postHeader'>
        <a className='handle profileLink' href={actorId}>
          <ProfileIcon size='tiny' icon={icon} />
          <ImmersHandle {...actor} showName />
        </a>
        {location}
      </div>
    </div>
  )
}
