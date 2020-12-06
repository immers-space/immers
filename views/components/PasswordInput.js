import React from 'react'
import c from 'classnames'
import 'emoji-mart/css/emoji-mart.css'
import { Picker } from 'emoji-mart'

export default class PasswordInput extends React.Component {
  constructor () {
    super()
    this.wrapperRef = React.createRef()
    this.state = {
      showPicker: false,
      reveal: false,
      password: ''
    }
    this.handleEmojiSelect = this.handleEmojiSelect.bind(this)
    this.handleClickOutside = this.handleClickOutside.bind(this)
  }

  handleEmojiSelect (emoji) {
    this.setState(state => ({
      password: state.password + emoji.native
    }))
  }

  handleClickOutside (event) {
    if (this.wrapperRef && !this.wrapperRef.current.contains(event.target)) {
      this.setState({ showPicker: false })
    }
  }

  render () {
    return (
      <div
        onFocus={() => this.setState({ showPicker: true })}
        ref={this.wrapperRef}
      >
        <div className={c({ 'form-item': true, hidden: !!this.props.hide })}>
          <label>Password:</label>
          <div className='relative'>
            <input
              id='password' className='aesthetic-windows-95-text-input with-feedback'
              type={this.state.reveal ? 'text' : 'password'} name='password'
              required pattern='.{3,32}'
              title='Between 3 and 32 characters'
              value={this.state.password}
              onChange={(e) => { this.setState({ password: e.target.value }) }}
            />
            <span
              className='form-item-feedback'
              onMouseDown={e => e.preventDefault()}
              onClick={() => this.setState({ reveal: !this.state.reveal })}
            >
              {this.state.reveal ? '🔒' : '👁️'}
            </span>
          </div>
        </div>
        <div
          className={c({ 'form-item': true, emoji: true, hidden: !this.state.showPicker })}
        >
          <Picker
            onSelect={this.handleEmojiSelect}
            recent={['']} emojiSize={36} perLine={11}
            title='Emoji Password' emoji='closed_lock_with_key'
          />
        </div>
      </div>
    )
  }

  componentDidMount () {
    document.addEventListener('mousedown', this.handleClickOutside)
  }

  componentWillUnmount () {
    document.removeEventListener('mousedown', this.handleClickOutside)
  }
}
