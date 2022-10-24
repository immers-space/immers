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
      <div className='handle-input'>
        <label htmlFor='username'>Immers handle:</label>
        <div className='flex'>
          <input
            onChange={this.handleInput}
            id='username'
            type='text' inputMode='email' name='username'
            placeholder='username'
            required pattern='^[A-Za-z0-9-]{3,32}$'
            autoCapitalize='off' autoCorrect='off' spellCheck='false'
            title='Letters, numbers, &amp; dashes only, between 3 and 32 characters'
            value={this.state.username}
            onKeyPress={this.props.onKeyPress}
          />
          <label htmlFor='immer' className='home-label'>Home immer:</label>
          <span className='handle-bracket'>[</span>
          <input
            onChange={this.handleInput}
            id='immer'
            type='text' inputMode='url' name='immer'
            placeholder='your.immer'
            required pattern='localhost(:\d+)?|.+\..+'
            autoCapitalize='off' autoCorrect='off' spellCheck='false'
            title='Valid domain name, including .'
            value={this.state.immer} disabled={this.props.lockImmer}
            onKeyPress={this.props.onKeyPress}
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

HandleInput.defaultProps = {
  onKeyPress: () => {}
}
