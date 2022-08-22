import React, { useEffect } from 'react'
import { Router, Link, useMatch, useNavigate } from '@reach/router'
import './Profile.css'
import Layout from '../components/Layout'
import Tab from '../components/Tab'
import Feed from './Feed'
import ImmersHandle from '../components/ImmersHandle'
import Friends from './Friends'
import { AvatarPreview } from '../components/AvatarPreview'
import { immersClient, useProfile } from './utils/immersClient'

export default function Profile ({ actor, taskbarButtons }) {
  const navigate = useNavigate()
  const profile = useProfile()
  const actorObj = immersClient.activities.actor
  const isMyProfile = profile.username === actor
  const tabs = ['Outbox']
  let buttons

  if (isMyProfile) {
    tabs.unshift('Friends', 'Inbox')
    tabs.push('Avatars', 'History')
    // TODO: edit profile
    // buttons = <EmojiButton emoji='pencil2' title='Edit profile' />
  }
  const { currentTab } = useMatch(':currentTab') || {}
  useEffect(() => {
    if (!currentTab) {
      navigate(`/u/${actor}/${tabs[0]}`, { replace: true })
    }
  }, [currentTab])
  if (!actorObj) {
    return (
      <Layout contentTitle='Immers Profile'>
        <div className='aesthetic-windows-95-loader'>
          <div /><div /><div />
        </div>
      </Layout>
    )
  }
  return (
    <Layout contentTitle='Immers Profile' buttons={buttons} taskbar taskbarButtons={taskbarButtons}>
      <div className='profile'>
        <div className='userContainer'>
          <h2 className='displayName'>
            {actorObj.name}
          </h2>
          <h3>
            <ImmersHandle className='userImmer' {...actorObj} />
          </h3>
          <div className='aesthetic-windows-95-container-indent'>
            <AvatarPreview {...actorObj} />
          </div>
          <div className='aesthetic-windows-95-container-indent profileSummary'>
            {actorObj.summary}
          </div>
        </div>
        <div className='aesthetic-windows-95-tabbed-container'>
          <div className='aesthetic-windows-95-tabbed-container-tabs'>
            {tabs.map(tab => {
              return (
                <div key={tab}>
                  <Tab active={tab === currentTab}>
                    <Link to={tab}>{tab}</Link>
                  </Tab>
                </div>
              )
            })}
          </div>
          <div className='aesthetic-windows-95-container'>
            <Router>
              <Feed path='Outbox' iri={actorObj.outbox} />
              <Feed path='Inbox' iri={actorObj.inbox} />
              <Feed path='History' iri={actorObj.streams.destinations} />
              <Friends path='Friends' iri={actorObj.streams.friends} />
              <Feed path='Avatars' iri={actorObj.streams.avatars} showAvatarControls={isMyProfile} />
            </Router>
          </div>
        </div>
      </div>
    </Layout>
  )
}
