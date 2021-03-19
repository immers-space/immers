import React, { useContext, useEffect, useState } from 'react'
import { Router, Link, useMatch, useNavigate } from '@reach/router'
import './Profile.css'
import Layout from '../components/Layout'
import Tab from '../components/Tab'
import Feed from './Feed'
import ImmersHandle from '../components/ImmersHandle'
import ProfileIcon from '../components/ProfileIcon'
import ServerDataContext from './ServerDataContext'
import Friends from './Friends'
import EmojiButton from './EmojiButton'

export default function Profile ({ actor }) {
  const navigate = useNavigate()
  const { loggedInUser } = useContext(ServerDataContext)
  const [actorObj, setActorObj] = useState(null)
  // const [tabs, setTabs] = useState(['Outbox', 'Inbox'])
  const tabs = ['Outbox']
  let buttons
  if (loggedInUser === actor) {
    tabs.unshift('Friends', 'Inbox')
    // TODO: edit profile
    // buttons = <EmojiButton emoji='pencil2' title='Edit profile' />
  }
  const { currentTab } = useMatch(':currentTab') || {}
  useEffect(() => {
    window.fetch(`/u/${actor}`, {
      headers: {
        Accept: 'application/activity+json'
      }
    }).then(res => res.json())
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
    <Layout contentTitle='Immers Profile' buttons={buttons}>
      <div className='profile'>
        <div className='userContainer'>
          <h2 className='displayName'>
            {actorObj.name}
          </h2>
          <h3>
            <ImmersHandle className='userImmer' {...actorObj} />
          </h3>
          <ProfileIcon className='aesthetic-black-bg-color' size='large' icon={actorObj.icon} />
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
