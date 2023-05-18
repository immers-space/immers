import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { IntlProvider } from 'react-intl'
import c from 'classnames'
import HandleInput from '../components/HandleInput'
import Layout from '../components/Layout'
import FormError from '../components/FormError'
import Loader from '../components/Loader'

const search = new URLSearchParams(window.location.search)
const accountMergeProvider = search.get('merge')
const accountMergeProviderName = search.get('name')
const approvedProvider = search.get('provider')
const proposedUsername = search.get('username')
const mountNode = document.getElementById('app')
const reload = () => window.location.reload()
createRoot(mountNode).render(<OidcInterstitial />)

function OidcInterstitial () {
  const { domain } = window._serverData
  const [fetching, setFetching] = useState(false)
  let form
  if (accountMergeProvider) {
    form = <MergeForm {...{ fetching, setFetching }} />
  } else if (approvedProvider) {
    form = <ApprovedNotice />
  } else {
    form = <RegisterForm {...{ domain, fetching, setFetching }} />
  }
  return (
    <IntlProvider locale='en' defaultLocale='en'>
      <Layout contentTitle='Complete Registration'>
        <div className={c({ fetching })}>{form}</div>
      </Layout>
    </IntlProvider>
  )
}

function RegisterForm ({ domain, fetching, setFetching }) {
  const formEl = useRef()
  const [username, setUsername] = useState(proposedUsername ?? '')
  const [takenMessage, setTakenMessage] = useState('')
  const [registrationError, setRegistrationError] = useState(false)
  const [sessionInvalid, setSessionInvalid] = useState(false)
  const [registrationSuccess, setRegistrationSuccess] = useState(false)
  const [showLoader, setShowLoader] = useState(true)

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
      if (!result.ok && result.status < 500 && result.status !== 409) {
        setSessionInvalid(true)
        throw new Error(await result.text())
      }
      const { taken, error, redirect } = await result.json()
      if (taken) {
        setTakenMessage(error)
        setShowLoader(false)
      } else if (redirect) {
        // successfully registered & logged in
        setRegistrationSuccess(true)
        window.setTimeout(
          () => { window.location = redirect },
          showLoader ? 0 : 2000
        )
      } else {
        throw new Error(error)
      }
    } catch (err) {
      console.log(err.message)
      setRegistrationError(true)
      setShowLoader(false)
    } finally {
      setFetching(false)
    }
  }, [setFetching, setTakenMessage, setRegistrationError, setRegistrationSuccess])
  useEffect(() => {
    // auto-submit form when page loads if username prefilled
    if (proposedUsername) {
      formEl.current.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true })
      )
    } else {
      setShowLoader(false)
    }
  }, [])

  const disableSubmit = fetching || takenMessage || registrationSuccess || sessionInvalid

  return (
    <>
      {showLoader && <Loader />}
      <p className={c({ none: showLoader })}>
        You have successfully logged in!
        Please choose a username to complete your registration.
      </p>
      <form className={c({ none: showLoader })} action='/auth/oidc-interstitial' method='post' onSubmit={handleSubmit} ref={formEl}>
        <HandleInput onChange={handleUsername} username={username} immer={domain} invalid={takenMessage} lockImmer />
        <FormError show={takenMessage}>
          {takenMessage}
        </FormError>
        <FormError show={registrationError}>
          An error occured. Please try again.
        </FormError>
        <p className={c({ hidden: !sessionInvalid })}>
          We cannot process your request, please <a href='/auth/login'>login again</a>.
        </p>
        <div className={c('form-item', { hidden: !registrationSuccess })}>
          Account created. Redirecting to destination.
        </div>
        <div className='form-item'>
          <span>
            <button type='submit' disabled={disableSubmit}>Submit</button>
          </span>
        </div>
      </form>
    </>
  )
}

function MergeForm ({ fetching, setFetching }) {
  const providerName = accountMergeProviderName
    ? `${accountMergeProviderName} (${accountMergeProvider})`
    : accountMergeProvider
  const handleCheckAuthorized = useCallback(async () => {
    setFetching(true)
    const { redirect, pending } = await fetch('/auth/oidc-merge/check', {
      headers: { Accept: 'application/json' }
    }).then(res => res.json())
    console.log({ redirect, pending })
    if (redirect) {
      window.location = redirect
    }
    setFetching(false)
  }, [setFetching])
  useEffect(() => {
    // poll to see if approval has come in
    const timer = setInterval(handleCheckAuthorized, 5000)
    return () => clearInterval(timer)
  }, [handleCheckAuthorized])
  return (
    <>
      <p className='oidc-interstitial-merge-message'>
        We found an existing account for your e-mail address
        and sent you an e-mail to confirm you want to allow login
        via {providerName}. Once you click the authorization link
        in the email, this login will proceed automatically
      </p>
      <div class='grid'>
        <button onClick={handleCheckAuthorized} aria-busy={fetching} disabled={fetching}>Check</button>
        <button class='secondary' onClick={reload}>Resend</button>
      </div>
    </>
  )
}

function ApprovedNotice () {
  return (
    <>
      <p>
        Login provider approved. You may close this window.
      </p>
    </>
  )
}
