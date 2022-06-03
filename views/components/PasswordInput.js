import React from 'react'
import c from 'classnames'
import 'emoji-mart/css/emoji-mart.css'
import { Picker, store, getEmojiDataFromNative, Emoji } from 'emoji-mart'
import data from 'emoji-mart/data/all.json'
import GraphemeSplitter from 'grapheme-splitter'
const splitter = new GraphemeSplitter()

// disable emoji-mart history storage
store.setHandlers({
  getter: () => undefined,
  setter: () => undefined
})

export default class PasswordInput extends React.Component {
  constructor (props) {
    super(props)
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
    if (!this.state.showPicker) {
      this.setState({ showPicker: true })
    }
  }

  renderPassword (pass) {
    const chars = splitter.splitGraphemes(pass)
    return chars.map((char, i) => {
      const emoji = getEmojiDataFromNative(char, 'apple', data)
      if (emoji) {
        return (
          <Emoji
            key={`${i}`}
            emoji={emoji}
            set='apple'
            skin={emoji.skin || 1}
            size={24}
          />
        )
      }
      return <span key={`${i}`}>{char}</span>
    })
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
              type='password' name='password'
              required pattern='.{3,32}'
              title='Between 3 and 32 characters'
              value={this.state.password}
              onChange={(e) => { this.setState({ password: e.target.value }) }}
              autoFocus={this.props.autoFocus}
              onKeyPress={this.props.onKeyPress}
            />
            <span
              className='form-item-feedback'
              onMouseDown={e => e.preventDefault()}
              onClick={() => this.setState({ reveal: !this.state.reveal })}
            >
              {this.state.reveal ? '🔒' : '👁️'}
            </span>
            <div className='reveal-pass' onMouseDown={e => e.preventDefault()}>
              {this.state.reveal && this.renderPassword(this.state.password)}
            </div>
          </div>
        </div>
        <div
          className={c({ 'form-item': true, emoji: true, hidden: !this.state.showPicker })}
        >
          <Picker
            onSelect={this.handleEmojiSelect}
            exclude={['recent']} emojiSize={36} perLine={11}
            title='Emoji Password' emoji='closed_lock_with_key'
          />
        </div>
      </div>
    )
  }

  componentDidMount () {
    document.addEventListener('mousedown', this.handleClickOutside)
  }

  componentDidUpdate (prev) {
    if (this.props.autoFocus && !this.props.hide && prev.hide) {
      // autoFocus needs the delay to work due to css transition
      window.setTimeout(() => {
        this.inputRef.current.focus()
      }, 100)
    }
  }

  componentWillUnmount () {
    document.removeEventListener('mousedown', this.handleClickOutside)
  }
}
