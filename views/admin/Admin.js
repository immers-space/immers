import React, { useContext } from 'react'
import { Routes, Route } from 'react-router-dom'
import ServerDataContext from '../ap/ServerDataContext'
import { useCheckAdmin } from '../ap/utils/useCheckAdmin'
import LayoutLoader from '../components/LayoutLoader'
import AdminNavigation from './AdminNavigation'
import EditTheme from './EditTheme'
import OauthAdmin from './OauthAdmin'

export default function Admin ({ taskbarButtons }) {
  const { token } = useContext(ServerDataContext)
  const loading = !useCheckAdmin(token, true)
  return loading
    ? <LayoutLoader />
    : (
      <Routes>
        <Route path='oidc' element={<OauthAdmin taskbarButtons={taskbarButtons} />} />
        <Route path='theme' element={<EditTheme taskbarButtons={taskbarButtons} />} />
        <Route path='*' element={<AdminNavigation taskbarButtons={taskbarButtons} />} />
      </Routes>
      )
}
