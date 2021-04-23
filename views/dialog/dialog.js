import React from 'react'
import ReactDOM from 'react-dom'
import Layout from '../components/Layout'
import './dialog.css'

const perms = {
  viewProfile: { level: 0, description: 'Use your name and avatar' },
  viewPublic: { level: 0, description: 'View public posts in Immers Chat' },
  viewFriends: { level: 1, description: 'View your friends list' },
  viewPrivate: { level: 1, description: 'View private posts in Immers chat' },
  postLocation: { level: 2, description: 'Share your presence here with friends' },
  postUpdates: { level: 2, description: 'Save changes to your name and avatar' },
  postChat: { level: 2, description: 'Make posts in Immers chat and share selfies' },
  addFriends: { level: 3, description: 'Send and accept friend requests' },
  addBlocks: { level: 3, description: 'Add to your blocklist' },
  addInventory: { level: 3, description: 'Save new avatars and inventory items' },
  removeFriends: { level: 4, description: 'Remove existing friends' },
  removeBlocks: { level: 4, description: 'Undo past blocks' },
  removeInventory: { level: 4, description: 'Delete avatars and inventory items' },
  deletePosts: { level: 4, description: 'Delete Immers chats' }
}

const roleLevels = {
  public: 0,
  readOnly: 1,
  setStatus: 2,
  modAdditive: 3,
  modFull: 4
}

class Dialog extends React.Component {
  constructor () {
    super()
    const data = window._serverData || {}
    this.state = {
      ...data,
      roleOptions: [
        { label: 'Just identity', value: 'public', level: 0 },
        { label: 'Read messages', value: 'readOnly', level: 1 },
        { label: 'Status updates', value: 'setStatus', level: 2 },
        { label: 'Making friends', value: 'modAdditive', level: 3 },
        { label: 'Full access', value: 'modFull', level: 4 }
      ],
      selectedRole: 'public'
    }
    const preferredScope = data.preferredScope?.[0]
    if (this.state.roleOptions.find(({ value }) => value === preferredScope)) {
      this.state.selectedRole = preferredScope
    }
  }

  render () {
    const roleLevel = roleLevels[this.state.selectedRole]
    const cans = Object.entries(perms)
      .filter(([, { level }]) => level <= roleLevel)
    const cannots = Object.entries(perms)
      .filter(([, { level }]) => level > roleLevel)
    const roles = cans.map(([role]) => role).join(' ')
    return (
      <div className='aesthetic-windows-95-container-indent'>
        <p>Hi {this.state.username}!</p>
        <p>
          You're headed to <b>{this.state.clientName}</b> ({this.state.redirectUri}).
        </p>
        <p>How would you like to use your account while you're there?</p>

        <form action='/auth/decision' method='post'>
          <input name='transaction_id' type='hidden' value={this.state.transactionId} />
          <input name='scope' type='hidden' value={roles} />
          <div id='roleOptions'>
            {this.state.roleOptions.map(role =>
              <div key={role.value} className='roleOption'>
                <label>
                  <input
                    name='roleGranted' type='radio' value={role.value}
                    checked={this.state.selectedRole === role.value}
                    onChange={() => this.setState({ selectedRole: role.value })}
                  />
                  {role.label}
                </label>
              </div>
            )}
          </div>
          <div className='permissionsContainer'>
            <div className='permissionsInfo'>
              <div className='permissionsHeader'>CAN</div>
              <ul>
                {cans.map(([name, { description }]) => <li key={name}>{description}</li>)}
              </ul>
            </div>
            <div className='permissionsInfo'>
              <div className='permissionsHeader'>CANNOT</div>
              <ul>
                {cannots.map(([name, { description }]) => <li key={name}>{description}</li>)}
              </ul>
            </div>
          </div>
          <div className='form-item'>
            <span className='aesthetic-windows-95-button'>
              <button type='submit' name='allow' id='allow'>Allow</button>
            </span>
            <span className='aesthetic-windows-95-button'>
              <button type='submit' name='cancel' value='Deny' id='deny'>Deny</button>
            </span>
          </div>
        </form>
      </div>
    )
  }
}

const mountNode = document.getElementById('app')
ReactDOM.render(
  <Layout contentTitle='Authorization request'>
    <Dialog />
  </Layout>, mountNode)
