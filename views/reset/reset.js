import React from 'react'
import ReactDOM from 'react-dom'
import Layout from '../components/Layout'
import PasswordInput from '../components/PasswordInput'

class Reset extends React.Component {
  render () {
    return (
      <div className='aesthetic-windows-95-container-indent'>
        <p>Please choose a new password:</p>
        <form action='/auth/reset' method='post'>
          <PasswordInput />
          <div className='form-item'>
            <span className='aesthetic-windows-95-button'>
              <button type='submit' name='submit'>Submit</button>
            </span>
          </div>
        </form>
      </div>
    )
  }
}

const mountNode = document.getElementById('app')
ReactDOM.render(
  <Layout contentTitle='Password reset'>
    <Reset />
  </Layout>, mountNode)
