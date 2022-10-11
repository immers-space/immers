import React, { useCallback, useState } from 'react'
import ReactDOM from 'react-dom'
import { IntlProvider } from 'react-intl'
import c from 'classnames'
import HandleInput from '../components/HandleInput'
import Layout from '../components/Layout'
import GlitchError from '../components/GlitchError'

const mountNode = document.getElementById('app')
ReactDOM.render(<OidcInterstitial />, mountNode)

function OidcInterstitial () {
  const { domain } = window._serverData
  const [username, setUsername] = useState('')
  const [takenMessage, setTakenMessage] = useState('')
  const [fetching, setFetching] = useState(false)
  const [registrationError, setRegistrationError] = useState(false)
  const [sessionInavlid, setSessionInvalid] = useState(false)
  const [registrationSuccess, setRegistrationSuccess] = useState(false)

  const handleUsername = useCallback(username => {
    setUsername(username)
    setTakenMessage(false)
  }, [setUsername, setTakenMessage])
  const handleSubmit = useCallback(async (e) => {
    const registrationForm = e.target
    e.preventDefault()
    setFetching(true)
    setRegistrationError(false)
    setTakenMessage('')
    try {
      const result = await window.fetch(registrationForm.action, {
        method: 'POST',
        headers: {
          Accept: 'application/json'
        },
        body: new window.URLSearchParams(new window.FormData(registrationForm))
      })
      if (!result.ok && result.status < 500) {
        setSessionInvalid(true)
        throw new Error(await result.text())
      }
      const { taken, error, redirect } = await result.json()
      if (taken) {
        setTakenMessage(error)
      } else if (redirect) {
        // successfully registered & logged in
        setRegistrationSuccess(true)
        window.setTimeout(() => { window.location = redirect }, 2000)
      } else {
        throw new Error(error)
      }
    } catch (err) {
      console.log(err.message)
      setRegistrationError(true)
    } finally {
      setFetching(false)
    }
  }, [setFetching, setTakenMessage, setRegistrationError, setRegistrationSuccess])

  const disableSubmit = fetching || takenMessage || registrationSuccess || sessionInavlid

  return (
    <IntlProvider locale='en' defaultLocale='en'>
      <Layout contentTitle='Complete Registration'>
        <div className={c('aesthetic-windows-95-container-indent', { fetching })}>
          <p>
            You have successfully logged in!
            Please choose a username to complete your registration.
          </p>
          <form action='/auth/oidc-interstitial' method='post' onSubmit={handleSubmit}>
            <HandleInput onChange={handleUsername} username={username} immer={domain} lockImmer />
            <GlitchError show={takenMessage}>
              {takenMessage}
            </GlitchError>
            <GlitchError show={registrationError}>
              An error occured. Please try again.
            </GlitchError>
            <p className={c({ hidden: !sessionInavlid })}>
              We cannot process your request, please <a href='/auth/login'>login again</a>.
            </p>
            <div className={c('form-item', { hidden: !registrationSuccess })}>
              Account created. Redirecting to destination.
            </div>
            <div className='form-item'>
              <span className='aesthetic-windows-95-button'>
                <button type='submit' name='submit' disabled={disableSubmit}>Submit</button>
              </span>
            </div>
          </form>
        </div>
      </Layout>
    </IntlProvider>
  )
}
