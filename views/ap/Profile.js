import React, { useEffect, useState } from 'react'
import { Routes, Route, useMatch, useNavigate, useParams } from 'react-router-dom'
import './Profile.css'
import Layout from '../components/Layout'
import Tab from '../components/Tab'
import Feed from './Feed'
import ImmersHandle from '../components/ImmersHandle'
import Friends from './Friends'
import { AvatarPreview } from '../components/AvatarPreview'
import { immersClient, useProfile } from './utils/immersClient'
import { ImmersClient } from 'immers-client'
import LayoutLoader from '../components/LayoutLoader'
import EmojiButton from '../components/EmojiButton'
import { Emoji } from '../components/Emojis'

export default function Profile ({ taskbarButtons }) {
  const { actor } = useParams()
  const navigate = useNavigate()
  const myProfile = useProfile()
  const [profile, setProfile] = useState()
  const [isEditing, setIsEditing] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const isMyProfile = myProfile?.username === actor
  const tabs = [{ path: 'Outbox' }]
  const onDisplayNameChange = (event) => {
    setDisplayName(event.target.value)
  }
  const onBioChange = (event) => {
    setBio(event.target.value)
  }
  const onSave = () => {
    immersClient.updateProfileInfo({
      displayName,
      bio
    })
    setIsEditing(false)
  }
  let buttons

  if (isMyProfile) {
    tabs.unshift({ path: 'Friends' }, { path: 'Inbox' })
    tabs.push(
      { path: 'Avatars' },
      { label: 'My Destinations', path: 'Destinations' },
      { label: 'Friends Destinations', path: 'FriendsDestinations' }
    )

    if (isEditing) {
      buttons = [
        <EmojiButton key='save' emoji='floppy_disk' title='Save' tipSide='left' onClick={() => onSave()} />,
        <EmojiButton key='cancel' emoji='x' title='Cancel' tipSide='left' onClick={() => setIsEditing(false)} />
      ]
    } else {
      buttons = <EmojiButton emoji='pencil2' title='Edit profile' tipSide='left' onClick={() => setIsEditing(true)} />
    }
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
  useEffect(() => {
    if (isEditing) {
      setDisplayName(profile.displayName)
      setBio(profile.bio)
    }
  }, [isEditing])
  if (!profile) {
    return (
      <LayoutLoader contentTitle='Immers Profile' />
    )
  }
  return (
    <Layout contentTitle='Immers Profile' buttons={buttons} taskbar taskbarButtons={taskbarButtons}>
      <div className='profile'>
        <div className='userContainer'>
          <hgroup>
            {isEditing
              ? (
                <label className='editable'>
                  <span aria-hidden='true'>
                    <Emoji emoji='pencil2' size={16} set='apple' />
                  </span>
                  <input value={displayName} aria-label='Edit your display name' onChange={onDisplayNameChange} />
                </label>
                )
              : <h3 className='displayName'>{profile.displayName}</h3>}
            <h4>
              <ImmersHandle id={profile.id} preferredUsername={profile.username} />
            </h4>
          </hgroup>
          <section data-label='Avatar'>
            <AvatarPreview icon={profile.avatarImage} avatar={profile.avatarObject} />
          </section>
          {isEditing
            ? (
              <label className='editable'>
                <span aria-hidden='true'>
                  <Emoji emoji='pencil2' size={16} set='apple' />
                </span>
                <textarea className='profileSummary' value={bio} aria-label='Edit your bio' onChange={onBioChange} />
              </label>
              )
            : <section className='profileSummary'>{profile.bio}</section>}
        </div>
        <div>
          <nav className='tabs'>
            {tabs.map(({ path: tab, label }) => {
              return (
                <Tab key={tab} active={tab === currentTab} onClick={() => navigate(tab)}>
                  {label ?? tab}
                </Tab>
              )
            })}
          </nav>
          <section>
            <Routes>
              <Route path='Outbox' element={<Feed key={profile.collections.outbox} iri={profile.collections.outbox} />} />
              <Route path='Inbox' element={<Feed key={profile.collections.inbox} iri={profile.collections.inbox} />} />
              <Route path='Destinations' element={<Feed key={profile.collections.destinations} iri={profile.collections.destinations} expandLocationPosts />} />
              <Route path='FriendsDestinations' element={<Feed key={profile.collections.friendsDestinations} iri={profile.collections.friendsDestinations} expandLocationPosts />} />
              <Route path='Friends' element={<Friends key={profile.id} />} />
              <Route path='Avatars' element={<Feed key={profile.collections.avatars} iri={profile.collections.avatars} showAvatarControls={isMyProfile} />} />
            </Routes>
          </section>
        </div>
      </div>
    </Layout>
  )
}
