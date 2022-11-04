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

  function Client ({ _id, name, domain }) {
    return (
      <>
        <div><strong>{name}</strong> - <em>({domain})</em></div>
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
      <h3>OpenID Connect Clients</h3>
      <section>
        <div className='grid clients-grid'>
          {items.map(item => <Client key={item._id} {...item} />)}
        </div>
      </section>
      <button onClick={onAdd}>Add OpenID Connect Client</button>
    </div>
  )
}
