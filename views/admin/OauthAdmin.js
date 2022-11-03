import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import AddEditOauthClient from './AddEditOauthClient'
import OauthClients from './OauthClients'
import EmojiButton from '../components/EmojiButton'

export default function OAuthAdmin ({ taskbarButtons }) {
  const modes = {
    LIST_OAUTH_CLIENTS: 0,
    NEW_OAUTH_CLIENT: 1
  }
  const [mode, setMode] = useState(modes.LIST_OAUTH_CLIENTS)
  const [editId, setEditId] = useState(0)
  const [buttons, setButtons] = useState(null)
  useEffect(() => {
    if (mode !== modes.NEW_OAUTH_CLIENT) {
      setButtons(<EmojiButton emoji='back' title='Admin Home' to='..' />)
    } else if (mode !== modes.LIST_OAUTH_CLIENTS) {
      setButtons(<EmojiButton emoji='back' title='List OpenID Connect Clients' onClick={handleListOauth} />)
    } else {
      setButtons(null)
    }
  }, [mode])
  const handleListOauth = () => setMode(modes.LIST_OAUTH_CLIENTS)
  const handleNewOauth = () => {
    setEditId(0)
    setMode(modes.NEW_OAUTH_CLIENT)
  }
  const handleEdit = (id) => {
    setEditId(id)
    setMode(modes.NEW_OAUTH_CLIENT)
  }

  return (
    <Layout contentTitle='Immers Admin' taskbar buttons={buttons} taskbarButtons={taskbarButtons}>
      {mode === modes.LIST_OAUTH_CLIENTS && <OauthClients onEdit={handleEdit} onAdd={handleNewOauth} />}
      {mode === modes.NEW_OAUTH_CLIENT && <AddEditOauthClient showClientList={handleListOauth} editId={editId} />}
    </Layout>
  )
}
