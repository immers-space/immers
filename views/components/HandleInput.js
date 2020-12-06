import React from 'react'

export default class HandleInput extends React.Component {
  constructor () {
    super()
    this.state = {
      username: '',
      immer: ''
    }
    this.handleInput = this.handleInput.bind(this)
  }

  handleInput (e) {
    this.setState({ [e.target.name]: e.target.value }, () => {
      this.props.onChange(this.state.username, this.state.immer)
    })
  }

  render () {
    return (
      <div className='form-item'>
        <label>Immers handle:</label>
        <div>
          <input
            onChange={this.handleInput}
            id='username' className='aesthetic-windows-95-text-input handle'
            type='text' name='username'
            placeholder='username'
            required pattern='^[A-Za-z0-9-]{3,32}$'
            title='Letters, numbers, &amp; dashes only, between 3 and 32 characters'
          />
          [
          <input
            onChange={this.handleInput}
            id='immer' className='aesthetic-windows-95-text-input handle'
            type='text' name='immer'
            placeholder='your.immer'
            required pattern='localhost(:\d+)?|.+\..+'
            title='Valid domain name, including .'
            value={this.props.immer} disabled={!!this.props.immer}
          />
          ]
        </div>
      </div>
    )
  }
}
