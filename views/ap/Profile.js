import React, { useEffect, useState } from 'react'
import { Router, Link, useMatch } from '@reach/router'
import './Profile.css'
import Layout from '../components/Layout'
import Tab from '../components/Tab'
import Outbox from './Outbox'
import ImmersHandle from '../components/ImmersHandle'
import ProfileIcon from '../components/ProfileIcon'

export default function Profile ({ actor }) {
  const [actorObj, setActorObj] = useState(null)
  const [tabs, setTabs] = useState(['Outbox'])
  const { currentTab } = useMatch(':currentTab') || {}
  useEffect(() => {
    window.fetch(`/u/${actor}`, {
      headers: {
        Accept: 'application/activity+json'
      }
    }).then(res => res.json())
      .then(setActorObj)
  }, [actor])
  if (!actorObj) {
    return (
      <Layout contentTitle='Immers Profile'><div>Loading...</div></Layout>
    )
  }
  return (
    <Layout contentTitle='Immers Profile'>
      <div className='profile'>
        <div className='userContainer'>
          <h2 className='displayName'>
            {actorObj.name}
          </h2>
          <h3>
            <ImmersHandle className='userImmer' {...actorObj} />
          </h3>
          <div className='iconWrapper'>
            <ProfileIcon className='icon' icon={actorObj.icon} />
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
              <Outbox path='Outbox' iri={actorObj.outbox} />
              {/* <Outbox path='Outbox/:page' iri={actorObj.outbox} /> */}
            </Router>
          </div>
        </div>
      </div>
    </Layout>
  )
}
