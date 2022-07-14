import React, { useContext, useState, useEffect } from 'react'
import ServerDataContext from '../ap/ServerDataContext'
import './Admin.css'

export default function AddEditOauthClient ({ onSuccess, editId }) {
  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
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
        body: JSON.stringify({ name, domain, clientId, clientSecret })
      }).then(res => res.json())
        .then(response => {
          if (response.success) {
            onSuccess()
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
        body: JSON.stringify({ name, domain, clientId, clientSecret })
      }).then(res => res.json())
        .then(response => {
          if (response.success) {
            onSuccess()
          }
        })
    }
  }

  return (
    <div>
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
                  placeholder='name'
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
                  placeholder='domain'
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
                  placeholder='clientId'
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
                  placeholder='clientSecret'
                  autoCapitalize='off' autoCorrect='off' spellCheck='false'
                  value={clientSecret}
                />
              </div>
            </div>
            <button onClick={handleSubmit}>{editId ? 'Update' : 'Save'} Oauth Client</button>
          </form>
        </div>
      </div>
    </div>
  )
}
