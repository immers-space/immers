import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import { Router } from '@reach/router'
import Profile from './Profile'
import { IntlProvider } from 'react-intl'
import ServerDataContext from './ServerDataContext'
import Admin from '../admin/Admin'

const mountNode = document.getElementById('app')
ReactDOM.render(<Root />, mountNode)

function Root () {
  const [dataContext, setDataContext] = useState(window._serverData)
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
          <Admin path='/admin' />
        </Router>
      </ServerDataContext.Provider>
    </IntlProvider>
  )
}
