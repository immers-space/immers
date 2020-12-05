import React from 'react'
import ReactDOM from 'react-dom'
import Tab from '../components/Tab'
import c from 'classnames'
import GlitchError from '../components/GlitchError'
import HandleInput from '../components/HandleInput'

class Login extends React.Component {
  constructor () {
    super()
    this.state = {
      currentState: undefined,
      data: window._serverData || {},
      tabs: ['Login', 'Register'],
      tab: 'Login',
      username: '',
      // immer: '',
      handle: '',
      tokenError: false,
      emailed: false,
      isRemote: false,
      usernameError: false,
      takenError: false,
      registrationError: false,
      registrationEmailed: false,
      canSubmitHandle: false,
      canSubmitRegistration: true
    }
    this.handleHandleInput = this.handleHandleInput.bind(this)
    this.handleLookup = this.handleLookup.bind(this)
    this.handleRedirect = this.handleRedirect.bind(this)
    this.handleLogin = this.handleLogin.bind(this)
    this.handleRegister = this.handleRegister.bind(this)
  }

  setLoginState (status) {
    this.setState(state => ({
      isRemote: status === 'remote',
      emailed: status === 'local',
      usernameError: status === 'error',
      canSubmitHandle: !status && !!this.state.handle
    }))
  }

  handleHandleInput (username, immer) {
    this.setState({
      username,
      handle: username && immer ? `${username}@${immer}` : ''
    }, () => this.setLoginState())
  }

  handleLookup () {
    this.setState({ fetching: true, canSubmitHandle: false })
    let state
    let redirectUri
    window.fetch('/auth/login', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ handle: this.state.handle })
    })
      .then(res => {
        if (!res.ok) { throw new Error(res.statusText) }
        return res.json()
      })
      .then(res => {
        if (res.emailed) {
          state = 'local'
        } else if (res.redirect) {
          // go to auth flow at users home immer, returning to this hub after
          redirectUri = res.redirect
          state = 'remote'
        } else {
          state = 'error'
        }
      })
      .catch(err => {
        console.error(err.message)
        state = 'error'
      })
      .then(() => {
        this.setState({
          fetching: false,
          redirectUri
        })
        this.setLoginState(state)
      })
  }

  handleRedirect () {
    window.location = this.state.redirectUri
  }

  // hidden submit button makes enter work in the login form's various states
  handleLogin (e) {
    e.preventDefault()
    if (this.state.isRemote) return this.handleRedirect()
    if (this.state.canSubmitHandle) this.handleLookup()
  }

  handleRegister (e) {
    const registrationForm = e.target
    let status
    let takenMessage
    e.preventDefault()
    this.setState({
      fetching: true,
      emailed: false,
      takenError: false,
      registrationError: false,
      canSubmitRegistration: false
    })
    window.fetch('/auth/user', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(Object.fromEntries(new window.FormData(registrationForm)))
    })
      .then(result => result.json())
      .then(obj => {
        if (obj.taken) {
          status = 'taken'
          takenMessage = obj.error
        } else if (obj.emailed) {
          status = 'emailed'
        } else {
          throw new Error(obj.error)
        }
      })
      .catch(err => {
        console.log(err.message)
        status = 'error'
      })
      .then(() => {
        this.setState({
          fetching: false,
          canSubmitRegistration: status !== 'emailed',
          registrationEmailed: status === 'emailed',
          registrationError: status === 'error',
          takenError: status === 'taken',
          takenMessage
        })
      })
    return false
  }

  render () {
    const topClass = c({
      'aesthetic-windows-95-tabbed-container': true,
      fetching: this.state.fetching
    })
    return (
      <div className={topClass}>
        <div className='aesthetic-windows-95-tabbed-container-tabs'>
          {this.state.tabs.map(tab => {
            return (
              <div key={tab} onClick={() => this.setState({ tab })}>
                <Tab active={this.state.tab === tab}>{tab}</Tab>
              </div>
            )
          })}
        </div>
        <div className='aesthetic-windows-95-container'>
          {this.state.tab === 'Login' &&
            <div id='login-form' className='aesthetic-windows-95-container-indent'>
              <form>
                <GlitchError show={this.state.tokenError}>
                  Unable to login. Please try again.
                </GlitchError>
                <HandleInput onChange={this.handleHandleInput} />
                <div className={c({ 'form-item': true, hidden: !this.state.emailed })}>
                  Please check your email for a login link.<br />You may close this tab.
                </div>
                <div className={c({ 'form-item': true, hidden: !this.state.isRemote })}>
                  You will be redirected to your home immer to login
                </div>
                <GlitchError show={this.state.usernameError}>
                  Please check your handle and try again
                </GlitchError>
                <div className='form-item'>
                  <span id='next' className='aesthetic-windows-95-button'>
                    <button
                      type='button' disabled={!this.state.canSubmitHandle}
                      onClick={this.handleLookup}
                    >
                      Check
                    </button>
                  </span>
                  <span id='submit' className='aesthetic-windows-95-button none'>
                    <button type='submit' onClick={this.handleLogin}>Login</button>
                  </span>
                  <span
                    id='redirect' onClick={this.handleRedirect}
                    className={c({ 'aesthetic-windows-95-button': true, none: !this.state.isRemote })}
                  >
                    <button type='button'>Proceed</button>
                  </span>
                </div>
              </form>
            </div>}
          {this.state.tab === 'Register' &&
            <div id='register-form' className='aesthetic-windows-95-container-indent'>
              <form action='/auth/user' method='post' onSubmit={this.handleRegister}>
                <HandleInput immer={this.state.data.domain} onChange={this.handleHandleInput} />
                <div className='form-item'>
                  <label>Display name:</label>
                  <input
                    id='handle' className='aesthetic-windows-95-text-input'
                    type='text' name='name'
                    pattern='^[A-Za-z0-9 -]{3,32}$'
                    title='Letters, numbers, spaces, &amp; dashes only, between 3 and 32 characters'
                    required
                  />
                </div>
                <div className='form-item'>
                  <label>E-mail address:</label>
                  <input
                    className='aesthetic-windows-95-text-input'
                    type='email' name='email'
                    required
                  />
                </div>
                <GlitchError show={this.state.takenError}>
                  {this.state.takenMessage}
                </GlitchError>
                <GlitchError show={this.state.registrationError}>
                  An error occured. Please try again.
                </GlitchError>
                <div className={c({ 'form-item': true, hidden: !this.state.registrationEmailed })}>
                  Account created. Please check your email for a verification link.<br />
                  You may close this tab.
                </div>
                <div className='form-item'>
                  <span className='aesthetic-windows-95-button'>
                    <button type='submit' disabled={!this.state.canSubmitRegistration}>
                      Sign up
                    </button>
                  </span>
                </div>
              </form>
            </div>}
        </div>
      </div>

    )
  }
}

const mountNode = document.getElementById('app')
ReactDOM.render(<Login />, mountNode)
