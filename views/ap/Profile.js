import React, { useContext, useEffect, useState } from 'react'
import { Router, Link, useMatch, useNavigate } from '@reach/router'
import './Profile.css'
import Layout from '../components/Layout'
import Tab from '../components/Tab'
import Feed from './Feed'
import ImmersHandle from '../components/ImmersHandle'
import ServerDataContext from './ServerDataContext'
import Friends from './Friends'
import EmojiLink from '../components/EmojiLink'
import { AvatarPreview } from '../components/AvatarPreview'

export default function Profile ({ actor }) {
  const navigate = useNavigate()
  const { loggedInUser, token } = useContext(ServerDataContext)
  const [actorObj, setActorObj] = useState(null)
  const tabs = ['Outbox']
  const taskbarButtons = []
  let buttons
  if (loggedInUser) {
    taskbarButtons.push(<EmojiLink key='logout' emoji='end' href='/auth/logout' title='Logout' />)
  } else {
    // login button
    taskbarButtons.push(<EmojiLink key='login' emoji='passport_control' href='/auth/login' title='Log in' />)
  }
  if (loggedInUser === actor) {
    tabs.unshift('Friends', 'Inbox')
    // TODO: edit profile
    // buttons = <EmojiButton emoji='pencil2' title='Edit profile' />
  }
  const { currentTab } = useMatch(':currentTab') || {}
  useEffect(() => {
    const headers = {
      Accept: 'application/activity+json'
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    window.fetch(`/u/${actor}`, { headers })
      .then(res => res.json())
      .then(setActorObj)
  }, [actor])
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
          <AvatarPreview {...actorObj} />
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
              <Friends path='Friends' iri={`${actorObj.id}/friends`} />
            </Router>
          </div>
        </div>
      </div>
    </Layout>
  )
}
