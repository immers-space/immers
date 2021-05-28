import React from 'react'

export default class HandleInput extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      username: props.username || '',
      immer: props.immer || ''
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
        <label for='username'>Immers handle:</label>
        <div>
          <input
            onChange={this.handleInput}
            id='username' className='aesthetic-windows-95-text-input handle'
            type='text' name='username'
            placeholder='username'
            required pattern='^[A-Za-z0-9-]{3,32}$'
            autoCapitalize='off' autoCorrect='off' spellCheck='false'
            title='Letters, numbers, &amp; dashes only, between 3 and 32 characters'
            value={this.state.username}
          />
          <label for='immer' className='home-label'>Home immer:</label>
          <span className='handle-bracket'>[</span>
          <input
            onChange={this.handleInput}
            id='immer' className='aesthetic-windows-95-text-input handle'
            type='url' name='immer'
            placeholder='your.immer'
            required pattern='localhost(:\d+)?|.+\..+'
            autoCapitalize='off' autoCorrect='off' spellCheck='false'
            title='Valid domain name, including .'
            value={this.state.immer} disabled={this.props.lockImmer}
          />
          <span className='handle-bracket'>]</span>
        </div>
      </div>
    )
  }

  componentDidUpdate () {
    const { username, immer } = this.props
    if (username !== this.state.username || immer !== this.state.immer) {
      this.setState({ username, immer })
    }
  }
}
