import React from 'react'
import { createRoot } from 'react-dom/client'
import Tab from '../components/Tab'
import c from 'classnames'
import FormError from '../components/FormError'
import HandleInput from '../components/HandleInput'
import PasswordInput from '../components/PasswordInput'
import Layout from '../components/Layout'
import EmailInput from '../components/EmailInput'
import EmailOptIn from '../components/EmailOptIn'
import ProviderLogin from '../components/ProviderLogin'

class Login extends React.Component {
  constructor (props) {
    super(props)
    const qParams = new URLSearchParams(window.location.search)
    const data = window._serverData || {}
    this.initialState = {
      local: false,
      isRemote: false,
      usernameError: false,
      takenError: false,
      registrationError: false,
      registrationSuccess: false,
      canSubmitHandle: false,
      canSubmitRegistration: true,
      canSubmitForgot: true
    }
    this.state = {
      data,
      currentState: undefined,
      tabs: data.enablePublicRegistration === 'true' ? ['Login', 'Register', 'Reset password'] : ['Login', 'Reset password'],
      tab: 'Login',
      username: data.username || '',
      immer: data.immer || '',
      isPrefilled: data.username.length && data.immer.length,
      passwordError: qParams.has('passwordfail'),
      loginProviders: [],
      ...this.initialState
    }
    if (this.state.tabs.includes(data.loginTab)) {
      this.state.tab = data.loginTab
    }
    const hash = window.location.hash.substring(1)
    if (this.state.tabs.includes(hash)) {
      this.state.tab = hash
    }
    this.handleHandleInput = this.handleHandleInput.bind(this)
    this.handleLookup = this.handleLookup.bind(this)
    this.handleRedirect = this.handleRedirect.bind(this)
    this.handleLogin = this.handleLogin.bind(this)
    this.handleRegister = this.handleRegister.bind(this)
    this.handleForgot = this.handleForgot.bind(this)
    this.handleProviderLogin = this.handleProviderLogin.bind(this)
    this.onEnter = this.onEnter.bind(this)
    this.submitForm = this.submitForm.bind(this)

    this.form = React.createRef()
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

  handleTab (tab) {
    // reset when switching tabs to avoid invalid states
    this.setState({ tab, ...this.initialState })
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
    const { username, immer } = this.state
    const search = new URLSearchParams({ username, immer }).toString()
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

  async handleProviderLogin (e) {
    const provider = e.target.dataset.provider
    const search = new URLSearchParams({ username: ' ', immer: provider }).toString()
    this.setState({ fetching: true })
    let redirect
    try {
      const result = await window.fetch(`/auth/home?${search}`, {
        headers: {
          Accept: 'application/json'
        }
      }).then(res => res.json())
      redirect = result.redirect
    } catch (err) {
      console.error(err)
    } finally {
      if (redirect) {
        window.location = redirect
      } else {
        this.setState({ fetching: false })
        this.setLoginState('error')
      }
    }
  }

  onEnter (cb) {
    return e => {
      if (e.key === 'Enter') {
        cb()
      }
    }
  }

  submitForm () {
    this.form.current.submit()
  }

  render () {
    const handleTaken = this.state.takenMessage?.includes('Username')
    const emailTaken = this.state.takenMessage?.includes('Email')
    const topClass = c({ fetching: this.state.fetching })
    return (
      <div id='auth-login' className={topClass}>
        <nav className='tabs'>
          {this.state.tabs.map(tab => {
            return (
              <Tab key={tab} onClick={() => this.handleTab(tab)} active={this.state.tab === tab}>
                {tab}
              </Tab>
            )
          })}
        </nav>
        <section>
          {this.state.tab === 'Login' &&
            <div id='login-form'>
              <form method='post' onSubmit={this.handleLogin} ref={this.form}>
                <HandleInput
                  onChange={this.handleHandleInput}
                  username={this.state.username} immer={this.state.immer}
                  onKeyPress={this.onEnter(this.handleLookup)}
                  invalid={this.state.usernameError}
                />
                <PasswordInput hide={!this.state.local} autoFocus onKeyPress={this.onEnter(this.submitForm)} />
                <div className={c({ 'form-item': true, hidden: !this.state.isRemote })}>
                  You will be redirected to your home immer to login
                </div>
                <FormError show={this.state.usernameError}>
                  Please check your handle and try again
                </FormError>
                <FormError show={this.state.passwordError}>
                  Username and/or password incorrect
                </FormError>
                <div className='form-item'>
                  <span className={c({ none: this.state.local })}>
                    <button
                      type='button' disabled={!this.state.canSubmitHandle}
                      onClick={this.handleLookup}
                    >
                      Check
                    </button>
                  </span>
                  <span className={c({ none: !this.state.local })}>
                    <button type='submit'>Login</button>
                  </span>
                  <span
                    id='redirect' onClick={this.handleRedirect}
                    className={c({ none: !this.state.isRemote })}
                  >
                    <button type='button'>Proceed</button>
                  </span>
                </div>
              </form>
              {this.state.loginProviders.length > 0 && (
                <div>
                  <p>Or login with another provider:</p>
                  <div className='provider-logins'>
                    {this.state.loginProviders.map(({ domain, buttonIcon, buttonLabel }) => (
                      <ProviderLogin
                        key={domain}
                        onClick={this.handleProviderLogin}
                        providerDomain={domain}
                        buttonIcon={buttonIcon}
                        buttonLabel={buttonLabel}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>}
          {this.state.tab === 'Register' &&
            <div id='register-form'>
              <form action='/auth/user' method='post' onSubmit={this.handleRegister}>
                <HandleInput
                  onChange={this.handleHandleInput}
                  username={this.state.username}
                  immer={this.state.data.domain}
                  invalid={handleTaken}
                  lockImmer
                />
                {/* hidden & defaults to username, use custom css to reveal if wanted */}
                <div className='form-item none'>
                  <label>Display name:</label>
                  <input
                    id='handle'
                    type='text' name='name'
                    pattern='^[A-Za-z0-9_~ -]{3,32}$'
                    title='Letters, numbers, spaces, &amp; dashes only, between 3 and 32 characters'
                  />
                </div>
                <EmailInput invalid={emailTaken} />
                <PasswordInput />
                <FormError show={this.state.takenError}>
                  {this.state.takenMessage}
                </FormError>
                <FormError show={this.state.registrationError}>
                  An error occured. Please try again.
                </FormError>
                <div className={c({ 'form-item': true, hidden: !this.state.registrationSuccess })}>
                  Account created. Redirecting to destination.
                </div>
                <button type='submit' disabled={!this.state.canSubmitRegistration}>
                  Sign up
                </button>
              </form>
              <EmailOptIn />
            </div>}
          {this.state.tab === 'Reset password' &&
            <div>
              <p>Enter your email to request a password reset link.</p>
              <form action='/auth/forgot' method='post' onSubmit={this.handleForgot}>
                <EmailInput />
                <FormError show={this.state.forgotError}>
                  Something went wrong. Please try again.
                </FormError>
                <div className={c({ 'form-item': true, hidden: !this.state.emailed })}>
                  Email sent. You may close this tab.
                </div>
                <div className='form-item'>
                  <button type='submit' disabled={!this.state.canSubmitForgot}>
                    Request
                  </button>
                </div>
              </form>
            </div>}
        </section>
      </div>
    )
  }

  componentDidMount () {
    // fetch provider login buttons
    window.fetch('/auth/oidc-providers', {
      headers: { Accept: 'application/json' }
    }).then(res => res.json())
      .then(loginProviders => this.setState({ loginProviders }))
      .catch(err => {
        console.warn('Unable to fetch login providers', err)
      })
    // if handle pre-filled, click lookup button
    if (this.state.username && this.state.immer) {
      this.handleLookup()
    }
  }

  componentDidUpdate () {
    // if handle pre-filled and remote, click proceed button
    if (this.state.isPrefilled && this.state.isRemote) {
      this.handleRedirect()
    }
  }
}

const mountNode = document.getElementById('app')
createRoot(mountNode).render(
  <Layout contentTitle='Login to your immers profile'>
    <Login />
  </Layout>)
