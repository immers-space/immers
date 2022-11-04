import React, { useContext } from 'react'
import { Link } from 'react-router-dom'
import EmojiButton from '../components/EmojiButton'
import ServerDataContext from '../ap/ServerDataContext'
import Layout from '../components/Layout'

export default function AdminNavigation ({ taskbarButtons }) {
  const { loggedInUser } = useContext(ServerDataContext)
  const buttons = <EmojiButton emoji='back' title='Back to Profile' tipSide='left' to={`/u/${loggedInUser}`} />
  return (
    <Layout contentTitle='Immers Admin' buttons={buttons} taskbar taskbarButtons={taskbarButtons}>
      <aside>
        <nav>
          <ul>
            <li><Link to='oidc'>Manage OpenID Connect Clients</Link></li>
            <li><Link to='theme'>Edit theme</Link></li>
          </ul>
        </nav>
      </aside>
    </Layout>
  )
}
