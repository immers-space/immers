import React, { useState, useContext, useEffect } from 'react'
import Layout from '../components/Layout'
import AddEditOauthClient from './AddEditOauthClient'
import OauthClients from './OauthClients'
import ServerDataContext from '../ap/ServerDataContext'
import EmojiButton from '../components/EmojiButton'
import { useCheckAdmin } from '../ap/utils/useCheckAdmin'
import Loader from '../components/Loader'

export default function Admin ({ taskbarButtons }) {
  const modes = {
    LIST_OAUTH_CLIENTS: 0,
    NEW_OAUTH_CLIENT: 1
  }
  const { token } = useContext(ServerDataContext)
  const [mode, setMode] = useState(modes.LIST_OAUTH_CLIENTS)
  const [editId, setEditId] = useState(0)
  const [buttons, setButtons] = useState(null)
  const loading = !useCheckAdmin(token, true)
  useEffect(() => {
    buttonHandler()
  }, [loading, mode])
  const handleListOauth = () => setMode(modes.LIST_OAUTH_CLIENTS)
  const handleNewOauth = () => {
    setEditId(0)
    setMode(modes.NEW_OAUTH_CLIENT)
  }
  const handleEdit = (id) => {
    setEditId(id)
    setMode(modes.NEW_OAUTH_CLIENT)
  }

  function buttonHandler () {
    if (!loading && mode !== modes.NEW_OAUTH_CLIENT) {
      setButtons(<EmojiButton emoji='heavy_plus_sign' title='Add OpenID connect Client' onClick={handleNewOauth} />)
    } else if (!loading && mode !== modes.LIST_OAUTH_CLIENTS) {
      setButtons(<EmojiButton emoji='back' title='List OpenID Connect Clients' onClick={handleListOauth} />)
    } else {
      setButtons(null)
    }
  }

  return (
    <Layout contentTitle='Immers Admin' taskbar buttons={buttons} taskbarButtons={taskbarButtons}>
      {loading && <Loader />}
      {!loading && mode === modes.LIST_OAUTH_CLIENTS && <OauthClients onEdit={handleEdit} onAdd={handleNewOauth} />}
      {!loading && mode === modes.NEW_OAUTH_CLIENT && <AddEditOauthClient showClientList={handleListOauth} editId={editId} />}
    </Layout>
  )
}
