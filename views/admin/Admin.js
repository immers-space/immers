import React, { useState, useContext, useEffect } from 'react'
import Layout from '../components/Layout'
import AddEditOauthClient from './AddEditOauthClient'
import OauthClients from './OauthClients'
import ServerDataContext from '../ap/ServerDataContext'
import './Admin.css'
import EmojiButton from '../ap/EmojiButton'

export default function Admin () {
  const modes = {
    LIST_OAUTH_CLIENTS: 0,
    NEW_OAUTH_CLIENT: 1
  }
  const { token } = useContext(ServerDataContext)
  const [loading, setLoading] = useState(true)
  const [adminTimeout, setAdminTimeout] = useState(null)
  const [mode, setMode] = useState(modes.LIST_OAUTH_CLIENTS)
  const [editId, setEditId] = useState(0)
  const [buttons, setButtons] = useState(null)
  useEffect(() => {
    checkAdmin()
  }, [token])
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
  const handleAdd = () => {
    setMode(modes.NEW_OAUTH_CLIENT)
  }

  function checkAdmin () {
    window.clearTimeout(adminTimeout)
    if (!token) {
      setAdminTimeout(setTimeout(() => {
        redirectToLogin()
      }, 4000))
      return
    }
    window.fetch('/a/is-admin', {
      headers: {
        Accept: 'application/activity+json',
        Authorization: `Bearer ${token}`
      }
    }).then(res => res.json())
      .then(res => {
        if (res.isAdmin) {
          setLoading(false)
        }
      })
      .catch(() => {
        redirectToProfile()
      })
  }

  function redirectToProfile () {
    window.location = '/'
  }

  function redirectToLogin () {
    window.location = '/auth/login'
  }

  function buttonHandler () {
    if (!loading && mode !== modes.NEW_OAUTH_CLIENT) {
      setButtons(<EmojiButton emoji='heavy_plus_sign' title='Add Oauth Client' onClick={handleNewOauth} />)
    } else if (!loading && mode !== modes.LIST_OAUTH_CLIENTS) {
      setButtons(<EmojiButton emoji='back' title='List Oauth Clients' onClick={handleListOauth} />)
    } else {
      setButtons(null)
    }
  }

  return (
    <Layout contentTitle='Immers Admin' taskbar buttons={buttons}>
      {loading &&
        <div className='aesthetic-windows-95-loader'>
          <div /><div /><div />
        </div>}
      {!loading && mode === modes.LIST_OAUTH_CLIENTS && <OauthClients onEdit={handleEdit} onAdd={handleAdd} />}
      {!loading && mode === modes.NEW_OAUTH_CLIENT && <AddEditOauthClient showClientList={handleListOauth} editId={editId} />}
    </Layout>
  )
}
