import React from 'react'
import { createRoot } from 'react-dom/client'
import Layout from '../components/Layout'
import './dialog.css'
import { scopes, roles } from '../../common/scopes'

class Dialog extends React.Component {
  constructor () {
    super()
    const data = window._serverData || {}
    this.state = {
      ...data,
      roleOptions: roles,
      selectedRole: 'public'
    }
    const preferredScope = data.preferredScope?.[0]
    if (this.state.roleOptions.find(({ name }) => name === preferredScope)) {
      this.state.selectedRole = preferredScope
    }
  }

  scopesToItems (scopes) {
    return scopes.map(scope => scope.description)
      .flat()
      .map((text, i) => <li key={i}>{text}</li>)
  }

  render () {
    const roleLevel = this.state.roleOptions
      .find(({ name }) => name === this.state.selectedRole)
      .level
    const cans = Object.values(scopes)
      .filter(({ level }) => level <= roleLevel)
    const cannots = Object.values(scopes)
      .filter(({ level }) => level > roleLevel)
    const approvedScopes = cans.map(({ name }) => name).join(' ')
    return (
      <div id='authorization-dialog'>
        <p>
          Hi {this.state.username}! <br />
          You're headed to {
            this.state.clientName
              ? <span><b>{this.state.clientName}</b> ({this.state.redirectUri}).</span>
              : <span><b>{this.state.redirectUri}</b></span>
            }
          <br />
          How would you like to use your account while you're there?
        </p>

        <form action='/auth/decision' method='post'>
          <input name='transaction_id' type='hidden' value={this.state.transactionId} />
          <input name='scope' type='hidden' value={approvedScopes} />
          <div id='roleOptions'>
            {this.state.roleOptions.map(role =>
              <div key={role.name} className='roleOption'>
                <label>
                  <input
                    name='roleGranted' type='radio' value={role.name}
                    checked={this.state.selectedRole === role.name}
                    onChange={() => this.setState({ selectedRole: role.name })}
                  />
                  {role.label}
                </label>
              </div>
            )}
          </div>
          <div className='grid permissionsContainer'>
            <div className='permissionsInfo'>
              <div className='permissionsHeader'>CAN</div>
              <ul>
                {this.scopesToItems(cans)}
              </ul>
            </div>
            <div className='permissionsInfo'>
              <div className='permissionsHeader'>CANNOT</div>
              <ul>
                {this.scopesToItems(cannots)}
              </ul>
            </div>
          </div>
          <div className='grid'>
            <button type='submit' name='allow' id='allow'>Allow</button>
            <button className='secondary' type='submit' name='cancel' value='Deny' id='deny'>Deny</button>
          </div>
        </form>
      </div>
    )
  }
}

const mountNode = document.getElementById('app')
createRoot(mountNode).render(
  <Layout contentTitle='Authorization request'>
    <Dialog />
  </Layout>)
