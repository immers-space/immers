import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import { Router } from '@reach/router'
import Profile from './Profile'
import { IntlProvider } from 'react-intl'
import ServerDataContext from './ServerDataContext'
import Thread from './Thread'
import ObjectView from './ObjectView'
import EmojiLink from '../components/EmojiLink'
import Admin from '../admin/Admin'
import { useCheckAdmin } from './utils/useCheckAdmin'

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
  const [dataContext, setDataContext] = useState({
    ...window._serverData,
    isInIframe: inIframe()
  })
  const isAdmin = useCheckAdmin(dataContext.token)

  const taskbarButtons = []
  if (isAdmin) {
    taskbarButtons.push(<EmojiLink key='admin' emoji='princess' href='/admin' title='Administrator Settings' />)
  }
  if (dataContext.loggedInUser) {
    taskbarButtons.push(<EmojiLink key='logout' emoji='end' href='/auth/logout' title='Logout' />)
  } else {
    // login button
    taskbarButtons.push(<EmojiLink key='login' emoji='passport_control' href='/auth/login' title='Log in' />)
  }

  useEffect(() => {
    if (!dataContext.loggedInUser) {
      return
    }
    const newData = Object.assign({}, dataContext)
    window.fetch('/auth/token', {
      method: 'POST'
    })
      .then(res => res.text())
      .then(token => {
        newData.token = token
        return window.fetch('/auth/me', {
          headers: {
            Accept: 'application/activity+json',
            Authorization: `Bearer ${token}`
          }
        })
      })
      .then(res => res.json())
      .then(actor => {
        newData.actor = actor
        setDataContext(newData)
      })
      .catch(err => console.error(err.message))
  }, [])
  return (
    <IntlProvider locale='en' defaultLocale='en'>
      <ServerDataContext.Provider value={dataContext}>
        <Router>
          <Profile path='/u/:actor/*' taskbarButtons={taskbarButtons} />
          <Thread path='/s/:activityId' taskbarButtons={taskbarButtons} />
          <ObjectView path='/o/:objectId' taskbarButtons={taskbarButtons} />
          <Admin path='/admin' taskbarButtons={taskbarButtons} />
        </Router>
      </ServerDataContext.Provider>
    </IntlProvider>
  )
}
