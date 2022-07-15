import React, { useContext, useState, useEffect } from 'react'
import ServerDataContext from '../ap/ServerDataContext'
import GlitchError from '../components/GlitchError'
import ProviderLogin from '../components/ProviderLogin'
import './Admin.css'

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
    <div className='adminContainer'>
      <h3>
        {editId ? 'Edit' : 'Add'} OpenID Connect Client
      </h3>
      <div className='aesthetic-windows-95-container'>
        <div className='aesthetic-windows-95-container-indent'>
          <form onSubmit={handleSubmit}>
            <div className='form-item'>
              <label htmlFor='name'>Name:</label>
              <div>
                <input
                  onChange={handleInput}
                  id='name' className='aesthetic-windows-95-text-input'
                  type='text' inputMode='text' name='name'
                  placeholder='Name'
                  required pattern='^[A-Za-z0-9-]{3,32}$'
                  autoCapitalize='off' autoCorrect='off' spellCheck='false'
                  title='Letters, numbers, &amp; dashes only, between 3 and 32 characters'
                  value={name}
                />
              </div>
            </div>
            <div className='form-item'>
              <label htmlFor='domain'>Provider domain:</label>
              <div>
                <input
                  disabled={!!editId}
                  onChange={handleInput}
                  id='domain' className='aesthetic-windows-95-text-input'
                  type='text' inputMode='text' name='domain'
                  placeholder='accounts.domain.com'
                  autoCapitalize='off' autoCorrect='off' spellCheck='false'
                  value={domain}
                />
              </div>
            </div>
            <div className='form-item'>
              <label htmlFor='clientId'>Client ID:</label>
              <div>
                <input
                  onChange={handleInput}
                  id='clientId' className='aesthetic-windows-95-text-input'
                  type='text' inputMode='text' name='clientId'
                  placeholder='Provided Client Id'
                  autoCapitalize='off' autoCorrect='off' spellCheck='false'
                  value={clientId}
                />
              </div>
            </div>
            <div className='form-item'>
              <label htmlFor='clientSecret'>Client Secret:</label>
              <div>
                <input
                  onChange={handleInput}
                  id='clientSecret' className='aesthetic-windows-95-text-input'
                  type='text' inputMode='text' name='clientSecret'
                  placeholder={editId ? '(not shown)' : 'Provided Client Secret'}
                  autoCapitalize='off' autoCorrect='off' spellCheck='false'
                  value={clientSecret}
                />
              </div>
            </div>
            <fieldset className='marginBottom'>
              <legend>Optional Login Button</legend>
              <label className='aesthetic-windows-95-checkbox'>
                Show
                <input
                  onChange={handleInput}
                  id='showButton'
                  type='checkbox' name='showButton'
                  checked={showButton}
                />
                <span className='aesthetic-windows-95-checkmark' />
              </label>
              <div className='form-item'>
                <label htmlFor='buttonIcon'>Button Icon:</label>
                <div>
                  <input
                    onChange={handleInput}
                    id='buttonIcon' className='aesthetic-windows-95-text-input'
                    type='text' inputMode='text' name='buttonIcon'
                    placeholder='Image URL'
                    autoCapitalize='off' autoCorrect='off' spellCheck='false'
                    value={buttonIcon}
                  />
                </div>
              </div>
              <div className='form-item'>
                <label htmlFor='buttonLabel'>Button Label:</label>
                <div>
                  <input
                    onChange={handleInput}
                    id='buttonLabel' className='aesthetic-windows-95-text-input'
                    type='text' inputMode='text' name='buttonLabel'
                    placeholder='Button Label'
                    autoCapitalize='off' autoCorrect='off' spellCheck='false'
                    value={buttonLabel}
                  />
                </div>
              </div>
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
            <button className='adminButton' onClick={handleSubmit}>{editId ? 'Update' : 'Save'} OpenID Connect Client</button>
            <button className='adminButton marginLeft' onClick={showClientList}>Cancel</button>
          </form>
        </div>
      </div>
    </div>
  )
}
