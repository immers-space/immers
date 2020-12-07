import React from 'react'
import ReactDOM from 'react-dom'
import Tab from '../components/Tab'
import c from 'classnames'
import GlitchError from '../components/GlitchError'
import HandleInput from '../components/HandleInput'
import PasswordInput from '../components/PasswordInput'
import Layout from '../components/Layout'
import EmailInput from '../components/EmailInput'

class Login extends React.Component {
  constructor () {
    super()
    const qParams = new URLSearchParams(window.location.search)
    this.state = {
      currentState: undefined,
      data: window._serverData || {},
      tabs: ['Login', 'Register', 'Reset password'],
      tab: 'Login',
      username: '',
      immer: '',
      handle: '',
      passwordError: qParams.has('passwordfail'),
      isRemote: false,
      usernameError: false,
      takenError: false,
      registrationError: false,
      registrationSuccess: false,
      canSubmitHandle: false,
      canSubmitRegistration: true,
      canSubmitForgot: true
    }
    this.handleHandleInput = this.handleHandleInput.bind(this)
    this.handleLookup = this.handleLookup.bind(this)
    this.handleRedirect = this.handleRedirect.bind(this)
    this.handleLogin = this.handleLogin.bind(this)
    this.handleRegister = this.handleRegister.bind(this)
    this.handleForgot = this.handleForgot.bind(this)
  }

  setLoginState (status) {
    const { username, immer } = this.state
    this.setState(state => ({
      isRemote: status === 'remote',
      local: status === 'local',
      usernameError: status === 'error',
      canSubmitHandle: !status && !!(username && immer),
      passwordError: false
    }))
  }

  handleHandleInput (username, immer) {
    this.setState({
      username,
      immer
    }, () => this.setLoginState())
  }

  handleLookup () {
    this.setState({ fetching: true, canSubmitHandle: false })
    let state
    let redirectUri
    const { immer } = this.state
    const search = new URLSearchParams({ immer }).toString()
    window.fetch(`/auth/home?${search}`, {
      headers: {
        Accept: 'application/json'
      }
    })
      .then(res => {
        if (!res.ok) { throw new Error(res.statusText) }
        return res.json()
      })
      .then(res => {
        if (res.local) {
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

  // makes enter work in the login form's various states
  handleLogin (e) {
    if (this.state.local) {
      return true
    }
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
      local: false,
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
        } else if (obj.redirect) {
          // successfully registered & logged in
          status = 'success'
          window.setTimeout(() => { window.location = obj.redirect }, 2000)
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
          canSubmitRegistration: status !== 'success',
          registrationSuccess: status === 'success',
          registrationError: status === 'error',
          takenError: status === 'taken',
          takenMessage
        })
      })
    return false
  }

  handleForgot (e) {
    const forgotForm = e.target
    let status
    e.preventDefault()
    this.setState({
      fetching: true,
      canSubmitForgot: false
    })
    window.fetch('/auth/forgot', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(Object.fromEntries(new window.FormData(forgotForm)))
    })
      .then(result => result.json())
      .then(obj => {
        if (obj.emailed) {
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
          canSubmitForgot: status !== 'emailed',
          emailed: status === 'emailed',
          forgotError: status === 'error'
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
              <form method='post' onSubmit={this.handleLogin}>
                <HandleInput onChange={this.handleHandleInput} />
                <PasswordInput hide={!this.state.local} autoFocus />
                <div className={c({ 'form-item': true, hidden: !this.state.isRemote })}>
                  You will be redirected to your home immer to login
                </div>
                <GlitchError show={this.state.usernameError}>
                  Please check your handle and try again
                </GlitchError>
                <GlitchError show={this.state.passwordError}>
                  Username and/or password incorrect
                </GlitchError>
                <div className='form-item'>
                  <span className={c({ 'aesthetic-windows-95-button': true, none: this.state.local })}>
                    <button
                      type='button' disabled={!this.state.canSubmitHandle}
                      onClick={this.handleLookup}
                    >
                      Check
                    </button>
                  </span>
                  <span className={c({ 'aesthetic-windows-95-button': true, none: !this.state.local })}>
                    <button type='submit'>Login</button>
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
                <EmailInput />
                <PasswordInput />
                <GlitchError show={this.state.takenError}>
                  {this.state.takenMessage}
                </GlitchError>
                <GlitchError show={this.state.registrationError}>
                  An error occured. Please try again.
                </GlitchError>
                <div className={c({ 'form-item': true, hidden: !this.state.registrationSuccess })}>
                  Account created. Redirecting to destination.
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
          {this.state.tab === 'Reset password' &&
            <div className='aesthetic-windows-95-container-indent'>
              <p>Enter your email to request a password reset link.</p>
              <form action='/auth/forgot' method='post' onSubmit={this.handleForgot}>
                <EmailInput />
                <GlitchError show={this.state.forgotError}>
                  Something went wrong. Please try again.
                </GlitchError>
                <div className={c({ 'form-item': true, hidden: !this.state.emailed })}>
                  Email sent. You may close this tab.
                </div>
                <div className='form-item'>
                  <span className='aesthetic-windows-95-button'>
                    <button type='submit' disabled={!this.state.canSubmitForgot}>
                      Request
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
ReactDOM.render(
  <Layout contentTitle='Login to your immers profile'>
    <Login />
  </Layout>, mountNode)
