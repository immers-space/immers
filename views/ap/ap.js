import React from 'react'
import ReactDOM from 'react-dom'
import { Router } from '@reach/router'
import Profile from './Profile'
import { IntlProvider } from 'react-intl'

const mountNode = document.getElementById('app')
ReactDOM.render(
  <IntlProvider locale='en' defaultLocale='en'>
    <Router>
      <Profile path='/u/:actor/*' />
    </Router>
  </IntlProvider>, mountNode)
