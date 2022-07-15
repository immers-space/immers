import React, { useContext, useState, useEffect } from 'react'
import ServerDataContext from '../ap/ServerDataContext'
import './Admin.css'

export default function AddEditOauthClient ({ showClientList, editId }) {
  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [buttonIcon, setButtonIcon] = useState('')
  const [buttonLabel, setButtonLabel] = useState('')
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
          setName(response.name)
          setDomain(response.domain)
          setClientId(response.clientId)
          setClientSecret(response.clientSecret)
          setButtonIcon(response?.buttonIcon ?? '')
          setButtonLabel(response?.buttonLabel ?? '')
        })
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
        body: JSON.stringify({ name, domain, clientId, clientSecret, buttonIcon, buttonLabel })
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
        body: JSON.stringify({ name, domain, clientId, clientSecret, buttonIcon, buttonLabel })
      }).then(res => res.json())
        .then(response => {
          if (response.success) {
            showClientList()
          }
        })
    }
  }

  function login () {
    alert('This login button is only a preview.')
  }

  return (
    <div className='adminContainer'>
      <h3>
        {editId ? 'Edit' : 'Add'} Oauth Client
      </h3>
      <div className='aesthetic-windows-95-container'>
        <div className='aesthetic-windows-95-container-indent'>
          <form onSubmit={handleSubmit}>
            <div className='form-item'>
              <label htmlFor='name'>Name:</label>
              <div>
                <input
                  onChange={handleInput}
                  id='name' className='aesthetic-windows-95-text-input handle'
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
              <label htmlFor='domain'>Domain:</label>
              <div>
                <input
                  onChange={handleInput}
                  id='domain' className='aesthetic-windows-95-text-input handle'
                  type='text' inputMode='text' name='domain'
                  placeholder='Domain'
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
                  id='clientId' className='aesthetic-windows-95-text-input handle'
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
                  id='clientSecret' className='aesthetic-windows-95-text-input handle'
                  type='text' inputMode='text' name='clientSecret'
                  placeholder='Provided Client Secret'
                  autoCapitalize='off' autoCorrect='off' spellCheck='false'
                  value={clientSecret}
                />
              </div>
            </div>
            <fieldset className='marginBottom'>
              <legend>Optional Login Button</legend>
              <div className='form-item'>
                <label htmlFor='buttonIcon'>Button Icon:</label>
                <div>
                  <input
                    onChange={handleInput}
                    id='buttonIcon' className='aesthetic-windows-95-text-input handle'
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
                    id='buttonLabel' className='aesthetic-windows-95-text-input handle'
                    type='text' inputMode='text' name='buttonLabel'
                    placeholder='Button Label'
                    autoCapitalize='off' autoCorrect='off' spellCheck='false'
                    value={buttonLabel}
                  />
                </div>
              </div>
              {buttonIcon && buttonLabel &&
                <div className='form-item'>
                  Preview: <button onClick={login} className='marginLeft loginButton'><img src={buttonIcon} />{buttonLabel}</button>
                </div>}
            </fieldset>
            <button className='adminButton' onClick={handleSubmit}>{editId ? 'Update' : 'Save'} Oauth Client</button>
            <button className='adminButton marginLeft' onClick={showClientList}>Cancel</button>
          </form>
        </div>
      </div>
    </div>
  )
}
