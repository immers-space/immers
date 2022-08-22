import React, { useEffect, useState } from 'react'
import { Router, Link, useMatch, useNavigate } from '@reach/router'
import './Profile.css'
import Layout from '../components/Layout'
import Tab from '../components/Tab'
import Feed from './Feed'
import ImmersHandle from '../components/ImmersHandle'
import Friends from './Friends'
import { AvatarPreview } from '../components/AvatarPreview'
import { immersClient, useProfile } from './utils/immersClient'
import { ImmersClient } from 'immers-client'

export default function Profile ({ actor, taskbarButtons }) {
  const navigate = useNavigate()
  const myProfile = useProfile()
  const [profile, setProfile] = useState()
  const isMyProfile = myProfile?.username === actor
  const tabs = ['Outbox']
  let buttons

  if (isMyProfile) {
    tabs.unshift('Friends', 'Inbox')
    tabs.push('Avatars', 'History')
    // TODO: edit profile
    // buttons = <EmojiButton emoji='pencil2' title='Edit profile' />
  }
  const { currentTab } = useMatch(':currentTab') || {}

  useEffect(async () => {
    if (isMyProfile) {
      setProfile(myProfile)
      return
    }
    const iri = new URL(window.location)
    iri.pathname = `/u/${actor}`
    const actorObj = await immersClient.activities.getObject(iri)
    setProfile(ImmersClient.ProfileFromActor(actorObj))
  }, [actor, myProfile])
  useEffect(() => {
    if (!currentTab) {
      navigate(`/u/${actor}/${tabs[0]}`, { replace: true })
    }
  }, [currentTab])
  if (!profile) {
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
            {profile.displayName}
          </h2>
          <h3>
            <ImmersHandle className='userImmer' id={profile.id} preferredUsername={profile.username} />
          </h3>
          <div className='aesthetic-windows-95-container-indent'>
            <AvatarPreview icon={profile.avatarImage} avatar={profile.avatarObject} />
          </div>
          <div className='aesthetic-windows-95-container-indent profileSummary'>
            {profile.bio}
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
              <Feed path='Outbox' iri={profile.collections.outbox} />
              <Feed path='Inbox' iri={profile.collections.inbox} />
              <Feed path='History' iri={profile.collections.destinations} />
              <Friends path='Friends' iri={profile.collections.friends} />
              <Feed path='Avatars' iri={profile.collections.avatars} showAvatarControls={isMyProfile} />
            </Router>
          </div>
        </div>
      </div>
    </Layout>
  )
}
