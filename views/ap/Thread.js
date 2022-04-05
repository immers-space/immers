import React, { useContext, useEffect, useState } from 'react'
import ServerDataContext from './ServerDataContext'
import Layout from '../components/Layout'
import Post from './Post'

export default function Thread ({ activityId }) {
  const { immersClient } = useContext(ServerDataContext)
  const [activity, setActivity] = useState()
  useEffect(async () => {
    const activitiyObj = await immersClient.activities.getObject(window.location.href)
    if (typeof activitiyObj.actor === 'string') {
      activitiyObj.actor = await immersClient.activities.getObject(activitiyObj.actor)
    }
    setActivity(activitiyObj)
  }, [activityId])
  if (!activity) {
    return (
      <Layout contentTitle='Immers Profile'>
        <div className='aesthetic-windows-95-loader'>
          <div /><div /><div />
        </div>
      </Layout>
    )
  }
  return (
    <Layout contentTitle='Immers Activity Thread'>
      <div className='thread-container'>
        <Post {...activity} />
      </div>
    </Layout>
  )
}
