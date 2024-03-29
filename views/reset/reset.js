import React from 'react'
import { createRoot } from 'react-dom/client'
import Layout from '../components/Layout'
import PasswordInput from '../components/PasswordInput'

class Reset extends React.Component {
  render () {
    return (
      <div id='auth-reset'>
        <p>Please choose a new password:</p>
        <form action='/auth/reset' method='post'>
          <PasswordInput />
          <button type='submit' name='submit'>Submit</button>
        </form>
      </div>
    )
  }
}

const mountNode = document.getElementById('app')
createRoot(mountNode).render(
  <Layout contentTitle='Password reset'>
    <Reset />
  </Layout>)
