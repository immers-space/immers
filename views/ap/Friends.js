import React, { useContext, useEffect, useState } from 'react'
import c from 'classnames'
import ImmersHandle from '../components/ImmersHandle'
import ProfileIcon from '../components/ProfileIcon'
import { ImmerLink } from './Post'
import ServerDataContext from './ServerDataContext'
import './Friends.css'
import EmojiButton from './EmojiButton'
import { accept, reject } from './utils/postActivity'

export default function Friends ({ iri }) {
  const [items, setItems] = useState([])
  const { token } = useContext(ServerDataContext)
  useEffect(() => {
    if (!token) {
      return
    }
    window.fetch(iri, {
      headers: {
        Accept: 'application/activity+json',
        Authorization: `Bearer ${token}`
      }
    }).then(res => res.json())
      .then(collectionPage => {
        setItems(items.concat(collectionPage.orderedItems))
      })
  }, [iri, token])
  return (
    <div className='aesthetic-windows-95-container-indent'>
      {items.map(item => <Friend key={item.id} {...item} />)}
    </div>
  )
}

function Friend ({ id, type, actor, summary, object = {}, target = {}, published }) {
  const { token, actor: me } = useContext(ServerDataContext)
  const [action, setAction] = useState('')
  const { id: actorId, icon } = actor
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
        <span className={c('friendManager', { hidden: action === 'accept' })}>
          sent you a friend request:
          <EmojiButton emoji='heavy_check_mark' title='Accept' onClick={() => { accept(id, actor, me, token); setAction('accept') }} />
          <EmojiButton emoji='x' title='Reject' onClick={() => { reject(id, actor, me, token); setAction('reject') }} />
        </span>
      )
      break
  }
  return (
    <div className={c({ none: action === 'reject' })}>
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
