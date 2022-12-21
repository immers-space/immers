import React from 'react'

export default function EmailOptIn () {
  const { emailOptInURL, passEmailToHub } = window._serverData
  const onClick = event => {
    event.preventDefault()
    const search = new URLSearchParams()
    const email = document.querySelector('input[name=email]').value
    if (email) {
      search.set('email', email)
    }
    const name = document.querySelector('input[name=name]').value
    if (name) {
      search.set('name', name)
    }
    window.open(`/auth/optin?${search}`, '_blank', 'noopener')
  }
  return (
    <p className='form-footer'>
      {!passEmailToHub && <span>We don't save your e-mail, just an encrypted hash of it for password resets.</span>}{' '}
      {emailOptInURL && (<span><a href={emailOptInURL} onClick={onClick}>Click here</a> to opt-in to our e-mail contact list.</span>)}
    </p>
  )
}
