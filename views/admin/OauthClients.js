import React, { useContext, useEffect, useState } from 'react'
import ServerDataContext from '../ap/ServerDataContext'
import EmojiButton from '../ap/EmojiButton'
import './Admin.css'
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
      <div>
        <div className='postHeader'>
          <div><strong>{name}</strong> - <em>({domain})</em></div> <div className='emojiButtonContainer'><EmojiButton emoji='bomb' title='Delete' onClick={() => deleteClient(_id, name)} /> <EmojiButton emoji='pencil2' title='Edit' onClick={() => editClient(_id)} /></div>
        </div>
      </div>
    )
  }

  function deleteClient (id, name) {
    if (window.confirm(`Delete the "${name}" OAuth Client?`)) {
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
    <div className='adminContainer'>
      <h3>Oauth Clients</h3>
      <div className='aesthetic-windows-95-container'>
        {items.map(item => <Client key={item._id} {...item} />)}
      </div>
      <button className='adminButton marginTop' onClick={onAdd}>Add OAuth Client</button>
    </div>
  )
}
