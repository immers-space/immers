import React from 'react'
import c from 'classnames'
import 'emoji-mart/css/emoji-mart.css'
import { Picker, store } from 'emoji-mart'

// disable emoji-mart history storage
store.setHandlers({
  getter: () => undefined,
  setter: () => undefined
})

export default class PasswordInput extends React.Component {
  constructor () {
    super()
    this.wrapperRef = React.createRef()
    this.inputRef = React.createRef()
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

  handleFocus () {
    this.setState({ showPicker: true })
    // timeout the transition delay so it has full height to calculate scroll
    window.setTimeout(() => {
      this.wrapperRef.current
        .scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 500)
  }

  render () {
    return (
      <div
        className='password-wrapper'
        onFocus={() => this.handleFocus()}
        ref={this.wrapperRef}
      >
        <div className={c({ 'form-item': true, hidden: !!this.props.hide })}>
          <label>Password:</label>
          <div className='relative'>
            <input
              id='password' className='aesthetic-windows-95-text-input with-feedback'
              ref={this.inputRef}
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
            exclude={['recent']} emojiSize={36} perLine={11} native
            title='Emoji Password' emoji='closed_lock_with_key'
          />
        </div>
      </div>
    )
  }

  componentDidMount () {
    document.addEventListener('mousedown', this.handleClickOutside)
    if (this.props.autofocus && !this.props.hide) {
      this.inputRef.current.focus()
    }
  }

  componentDidUpdate (prev) {
    if (this.props.autofocus && !this.props.hide && prev.hide) {
      // needs the delay to work due to css transition
      window.setTimeout(() => {
        this.inputRef.current.focus()
      }, 100)
    }
  }

  componentWillUnmount () {
    document.removeEventListener('mousedown', this.handleClickOutside)
  }
}
