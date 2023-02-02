import React, { useContext, useEffect, useState } from 'react'
import ServerDataContext from '../ap/ServerDataContext'
import EmojiButton from '../components/EmojiButton'
import './OauthClients.css'

export default function OauthClients ({ onEdit, onAdd }) {
  const { token } = useContext(ServerDataContext)
  const [items, setItems] = useState([])
  useEffect(() => {
    getClients()
  }, [token])

  function getClients () {
    if (!token) {
      return
    }
    window.fetch('/a/oauth-clients', {
      headers: {
        Accept: 'application/activity+json',
        Authorization: `Bearer ${token}`
      }
    }).then(res => res.json())
      .then(clients => {
        setItems(clients)
      })
  }

  function Client ({ _id, name, domain, type }) {
    return (
      <>
        <div><strong>{name}</strong> - <em>({domain})</em></div>
        <div className='clients-grid-type'>{type}</div>
        <EmojiButton emoji='bomb' title='Delete' onClick={() => deleteClient(_id, name)} />
        <EmojiButton emoji='pencil2' title='Edit' onClick={() => editClient(_id)} />
      </>
    )
  }

  function deleteClient (id, name) {
    if (window.confirm(`Delete the "${name}" OpenID Connect Client?`)) {
      window.fetch('/a/oauth-clients', {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id })
      }).then(res => res.json())
        .then(response => {
          if (response) {
            getClients()
          }
        })
    }
  }

  function editClient (id) {
    onEdit(id)
  }

  return (
    <div>
      <hgroup>
        <h3>Identity Provider Clients</h3>
        <h4>
          These providers are authorized to provide user identity for login to your immer.
          This includes other immers, OpenID Connect, and SAML.
        </h4>
      </hgroup>
      <section>
        <div className='grid clients-grid'>
          {items.map(item => <Client key={item._id} {...item} />)}
        </div>
      </section>
      <button onClick={onAdd}>Add Provider</button>
    </div>
  )
}
