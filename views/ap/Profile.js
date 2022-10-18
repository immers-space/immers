import React, { useEffect, useState } from 'react'
import { Routes, Route, Link, useMatch, useNavigate, useParams } from 'react-router-dom'
import './Profile.css'
import Layout from '../components/Layout'
import Tab from '../components/Tab'
import Feed from './Feed'
import ImmersHandle from '../components/ImmersHandle'
import Friends from './Friends'
import { AvatarPreview } from '../components/AvatarPreview'
import { immersClient, useProfile } from './utils/immersClient'
import { ImmersClient } from 'immers-client'

export default function Profile ({ taskbarButtons }) {
  const { actor } = useParams()
  const navigate = useNavigate()
  const myProfile = useProfile()
  const [profile, setProfile] = useState()
  const isMyProfile = myProfile?.username === actor
  const tabs = [{ path: 'Outbox' }]
  let buttons

  if (isMyProfile) {
    tabs.unshift({ path: 'Friends' }, { path: 'Inbox' })
    tabs.push(
      { path: 'Avatars' },
      { label: 'My Destinations', path: 'Destinations' },
      { label: 'Friends Destinations', path: 'FriendsDestinations' }
    )
    // TODO: edit profile
    // buttons = <EmojiButton emoji='pencil2' title='Edit profile' />
  }
  const { params: { currentTab } } = useMatch('/u/:actor/:currentTab') || { params: {} }

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
    if (!currentTab || !tabs.find(t => t.path === currentTab)) {
      navigate(`/u/${actor}/${tabs[0].path}`, { replace: true })
    }
  }, [currentTab, tabs])
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
            <ImmersHandle id={profile.id} preferredUsername={profile.username} />
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
            {tabs.map(({ path: tab, label }) => {
              return (
                <Tab key={tab} active={tab === currentTab}>
                  <Link to={tab}>{label ?? tab}</Link>
                </Tab>
              )
            })}
          </div>
          <div className='aesthetic-windows-95-container'>
            <Routes>
              <Route path='Outbox' element={<Feed key={profile.collections.outbox} iri={profile.collections.outbox} />} />
              <Route path='Inbox' element={<Feed key={profile.collections.inbox} iri={profile.collections.inbox} />} />
              <Route path='Destinations' element={<Feed key={profile.collections.destinations} iri={profile.collections.destinations} expandLocationPosts />} />
              <Route path='FriendsDestinations' element={<Feed key={profile.collections.friendsDestinations} iri={profile.collections.friendsDestinations} expandLocationPosts />} />
              <Route path='Friends' element={<Friends key={profile.id} />} />
              <Route path='Avatars' element={<Feed key={profile.collections.avatars} iri={profile.collections.avatars} showAvatarControls={isMyProfile} />} />
            </Routes>
          </div>
        </div>
      </div>
    </Layout>
  )
}
