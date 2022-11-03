import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import { Routes, Route, BrowserRouter } from 'react-router-dom'
import Profile from './Profile'
import { IntlProvider } from 'react-intl'
import ServerDataContext from './ServerDataContext'
import Thread from './Thread'
import ObjectView from './ObjectView'
import EmojiLink from '../components/EmojiLink'
import Admin from '../admin/Admin'
import { useCheckAdmin } from './utils/useCheckAdmin'
import { immersClient } from './utils/immersClient'
import LayoutLoader from '../components/LayoutLoader'

const mountNode = document.getElementById('app')
ReactDOM.render(<Root />, mountNode)

function inIframe () {
  try {
    return window.self !== window.top
  } catch (e) {
    return true
  }
}

function Root () {
  const [loading, setLoading] = useState(true)
  const [dataContext, setDataContext] = useState({
    ...window._serverData,
    isInIframe: inIframe()
  })
  const isAdmin = useCheckAdmin(dataContext.token)

  const taskbarButtons = []
  if (isAdmin) {
    taskbarButtons.push(<EmojiLink key='admin' emoji='princess' to='/admin' title='Administrator Settings' />)
  }
  if (dataContext.loggedInUser) {
    taskbarButtons.push(<EmojiLink key='logout' emoji='end' href='/auth/logout' title='Logout' />)
  } else {
    // login button
    taskbarButtons.push(<EmojiLink key='login' emoji='passport_control' href='/auth/login' title='Log in' />)
  }

  useEffect(() => {
    if (!dataContext.loggedInUser) {
      setLoading(false)
      return
    }
    const newData = Object.assign({}, dataContext)
    window.fetch('/auth/token', {
      method: 'POST'
    })
      .then(res => res.text())
      .then(token => {
        newData.token = token
        return immersClient.loginWithToken(token, dataContext.domain, '*')
      })
      .then(connected => {
        if (!connected) {
          throw new Error('Could not login')
        }
        newData.actor = immersClient.activities.actor
        newData.immersClient = immersClient
        // TODO: migrate consumers to useProfile
        setDataContext(newData)
      })
      .catch(err => console.error(err.message))
      .finally(() => setLoading(false))
  }, [])
  return (
    <IntlProvider locale='en' defaultLocale='en'>
      <ServerDataContext.Provider value={dataContext}>
        <BrowserRouter>
          {loading
            ? <LayoutLoader />
            : (
              <Routes>
                <Route path='/u/:actor/*' element={<Profile taskbarButtons={taskbarButtons} />} />
                <Route path='/s/:activityId' element={<Thread taskbarButtons={taskbarButtons} />} />
                <Route path='/o/:objectId' element={<ObjectView taskbarButtons={taskbarButtons} />} />
                <Route path='/admin/*' element={<Admin taskbarButtons={taskbarButtons} />} />
              </Routes>
              )}
        </BrowserRouter>
      </ServerDataContext.Provider>
    </IntlProvider>
  )
}
