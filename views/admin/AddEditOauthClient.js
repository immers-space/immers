import React, { useContext, useState, useEffect } from 'react'
import ServerDataContext from '../ap/ServerDataContext'
import GlitchError from '../components/GlitchError'
import ProviderLogin from '../components/ProviderLogin'

export default function AddEditOauthClient ({ showClientList, editId }) {
  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [showButton, setShowButton] = useState(false)
  const [buttonIcon, setButtonIcon] = useState('')
  const [buttonLabel, setButtonLabel] = useState('')
  const [error, setError] = useState(false)
  const { token } = useContext(ServerDataContext)

  useEffect(() => {
    if (editId) {
      window.fetch(`/a/oauth-client/${editId}`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }).then(res => res.json())
        .then(response => {
          setDomain(response.domain)
          setName(response.name ?? '')
          setClientId(response.clientId ?? '')
          setClientSecret(response.clientSecret ?? '')
          setShowButton(response.showButton ?? false)
          setButtonIcon(response?.buttonIcon ?? '')
          setButtonLabel(response?.buttonLabel ?? '')
        })
    } else {
      // clear out if component re-used
      setName('')
      setDomain('')
      setClientId('')
      setClientSecret('')
      setShowButton(false)
      setButtonIcon('')
      setButtonLabel('')
    }
  }, [editId])

  function handleInput (e) {
    switch (e.target.name) {
      case 'name':
        setName(e.target.value)
        break
      case 'domain':
        setDomain(e.target.value)
        break
      case 'clientId':
        setClientId(e.target.value)
        break
      case 'clientSecret':
        setClientSecret(e.target.value)
        break
      case 'showButton':
        setShowButton(e.target.checked)
        break
      case 'buttonIcon':
        setButtonIcon(e.target.value)
        break
      case 'buttonLabel':
        setButtonLabel(e.target.value)
        break
    }
  }

  function handleSubmit (e) {
    e.preventDefault()
    setError(false)
    if (!token) {
      return
    }
    if (editId) {
      window.fetch(`/a/oauth-client/${editId}`, {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, domain, clientId, clientSecret, showButton, buttonIcon, buttonLabel })
      }).then(res => res.json())
        .then(response => {
          if (response.success) {
            showClientList()
          }
        })
    } else {
      window.fetch('/a/oauth-clients', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, domain, clientId, clientSecret, showButton, buttonIcon, buttonLabel })
      }).then(res => res.json())
        .then(response => {
          if (response.success) {
            showClientList()
          } else if (response.step === 'discovery') {
            setError('discovery')
            console.error(response.error)
          } else {
            throw new Error(response.error)
          }
        }).catch(err => {
          console.error(err)
          setError(true)
        })
    }
  }

  function login (e) {
    e.preventDefault()
    window.alert('This login button is only a preview.')
  }

  return (
    <div>
      <h3>
        {editId ? 'Edit' : 'Add'} OpenID Connect Client
      </h3>
      <div>
        <div>
          <form onSubmit={handleSubmit}>
            <label>
              Name:
              <input
                onChange={handleInput}
                id='name'
                type='text' inputMode='text' name='name'
                placeholder='Name'
                required pattern='^[A-Za-z0-9-]{3,32}$'
                autoCapitalize='off' autoCorrect='off' spellCheck='false'
                title='Letters, numbers, &amp; dashes only, between 3 and 32 characters'
                value={name}
              />
            </label>
            <label>
              Provider domain:
              <input
                disabled={!!editId}
                onChange={handleInput}
                id='domain'
                type='text' inputMode='text' name='domain'
                placeholder='accounts.domain.com'
                autoCapitalize='off' autoCorrect='off' spellCheck='false'
                value={domain}
              />
            </label>
            <label>
              Client ID:
              <input
                onChange={handleInput}
                id='clientId'
                type='text' inputMode='text' name='clientId'
                placeholder='Provided Client Id'
                autoCapitalize='off' autoCorrect='off' spellCheck='false'
                value={clientId}
              />
            </label>
            <label>
              Client Secret:
              <input
                onChange={handleInput}
                id='clientSecret'
                type='text' inputMode='text' name='clientSecret'
                placeholder={editId ? '(not shown)' : 'Provided Client Secret'}
                autoCapitalize='off' autoCorrect='off' spellCheck='false'
                value={clientSecret}
              />
            </label>
            <fieldset class='outline'>
              <legend>Optional Login Button</legend>
              <label>
                <input
                  role='switch'
                  onChange={handleInput}
                  id='showButton'
                  type='checkbox' name='showButton'
                  checked={showButton}
                />
                Show
              </label>
              <label>
                Button Icon:
                <input
                  onChange={handleInput}
                  id='buttonIcon'
                  type='text' inputMode='text' name='buttonIcon'
                  placeholder='Image URL'
                  autoCapitalize='off' autoCorrect='off' spellCheck='false'
                  value={buttonIcon}
                />
              </label>
              <label>
                Button Label:
                <input
                  onChange={handleInput}
                  id='buttonLabel'
                  type='text' inputMode='text' name='buttonLabel'
                  placeholder='Button Label'
                  autoCapitalize='off' autoCorrect='off' spellCheck='false'
                  value={buttonLabel}
                />
              </label>
              {showButton &&
                <div className='form-item'>
                  Preview: <ProviderLogin onClick={login} providerDomain={domain} buttonIcon={buttonIcon} buttonLabel={buttonLabel} />
                </div>}
            </fieldset>
            {error === 'discovery' && (
              <>
                <GlitchError show>We couldn't process that OpenId Connect Provider</GlitchError>
                <p>Double check the domain or try putting the full discovery document url instead of the domain.</p>
              </>

            )}
            <GlitchError show={error === true}>Something when wrong. Please Try again</GlitchError>
            <div className='grid'>
              <button onClick={handleSubmit}>{editId ? 'Update' : 'Save'} OpenID Connect Client</button>
              <button className='secondary' onClick={showClientList}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
