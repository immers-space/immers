import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import { Router } from '@reach/router'
import { ImmersClient } from 'immers-client'
import Profile from './Profile'
import { IntlProvider } from 'react-intl'
import ServerDataContext from './ServerDataContext'
import Thread from './Thread'

const mountNode = document.getElementById('app')
ReactDOM.render(<Root />, mountNode)

function Root () {
  const client = new ImmersClient({}, {
    localImmer: window._serverData.domain,
    allowStorage: true
  })

  const [dataContext, setDataContext] = useState({
    ...window._serverData,
    immersClient: client
  })
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
          <Profile path='/u/:actor/*' />
          <Thread path='/s/:activityId' />
        </Router>
      </ServerDataContext.Provider>
    </IntlProvider>
  )
}
