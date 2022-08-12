import React, { useContext, useEffect, useState } from 'react'
import { immersClient } from './utils/immersClient'
import ServerDataContext from './ServerDataContext'
import Layout from '../components/Layout'
import Post from './Post'

// direct object view is for compatibility with services like Mastodon that
// use objects instead of activity as first-class objects
export default function ObjectView ({ objectId, taskbarButtons }) {
  const { isInIframe } = useContext(ServerDataContext)
  const [activity, setActivity] = useState()
  useEffect(async () => {
    const object = await immersClient.activities.getObject(window.location.href)
    const mockActivity = {
      ...object,
      type: 'Create',
      actor: object.attributedTo,
      object
    }
    if (typeof mockActivity.actor === 'string') {
      mockActivity.actor = await immersClient.activities.getObject(mockActivity.actor)
    }
    setActivity(mockActivity)
  }, [objectId])
  if (!activity) {
    return (
      <Layout contentTitle='Loading'>
        <div className='aesthetic-windows-95-loader'>
          <div /><div /><div />
        </div>
      </Layout>
    )
  }
  return (
    <Layout contentTitle='Object View' taskbar={!isInIframe} taskbarButtons={taskbarButtons}>
      <div className='thread-container'>
        <Post {...activity} />
      </div>
    </Layout>
  )
}