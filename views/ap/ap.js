import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import { Router } from '@reach/router'
import Profile from './Profile'
import { IntlProvider } from 'react-intl'
import ServerDataContext from './ServerDataContext'

const mountNode = document.getElementById('app')
ReactDOM.render(<Root />, mountNode)

function Root () {
  const [dataContext, setDataContext] = useState(window._serverData)
  useEffect(() => {
    if (!dataContext.loggedInUser) {
      return
    }
    window.fetch('/auth/token', {
      method: 'POST'
    })
      .then(res => res.text())
      .then(token => {
        const newData = Object.assign({}, dataContext)
        newData.token = token
        setDataContext(newData)
      })
      .catch(err => console.error(err.message))
  }, [])
  return (
    <IntlProvider locale='en' defaultLocale='en'>
      <ServerDataContext.Provider value={dataContext}>
        <Router>
          <Profile path='/u/:actor/*' />
        </Router>
      </ServerDataContext.Provider>
    </IntlProvider>
  )
}
