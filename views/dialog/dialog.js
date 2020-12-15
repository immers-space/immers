import React from 'react'
import ReactDOM from 'react-dom'
import Layout from '../components/Layout'

class Dialog extends React.Component {
  constructor () {
    super()
    const data = window._serverData || {}
    this.state = {
      ...data
    }
  }

  render () {
    return (
      <div className='aesthetic-windows-95-container-indent'>
        <p>Hi {this.state.username}!</p>
        <p><b>{this.state.clientName}</b> ({this.state.redirectUri}) is requesting access to your account.</p>
        <p>Do you approve?</p>

        <form action='/auth/decision' method='post'>
          <input name='transaction_id' type='hidden' value={this.state.transactionId} />
          <div className='form-item'>
            <span className='aesthetic-windows-95-button'>
              <button type='submit' name='allow' id='allow'>Allow</button>
            </span>
            <span className='aesthetic-windows-95-button'>
              <button type='submit' name='cancel' value='Deny' id='deny'>Deny</button>
            </span>
          </div>
        </form>
      </div>
    )
  }
}

const mountNode = document.getElementById('app')
ReactDOM.render(
  <Layout contentTitle='Authorization request'>
    <Dialog />
  </Layout>, mountNode)
