import React from 'react'
import c from 'classnames'
import { Picker, emojiI18n } from './Emojis'

export default class PasswordInput extends React.Component {
  constructor (props) {
    super(props)
    this.wrapperRef = React.createRef()
    this.inputRef = React.createRef()
    this.state = {
      showPicker: false,
      reveal: false,
      password: '',
      narrowPicker: window.innerWidth < 470,
      hideTimeout: null
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
      // on a delay so that it doesn't move the login button out from under your click
      const hideTimeout = window.setTimeout(() => this.setState({ showPicker: false }), 250)
      this.setState({ hideTimeout })
    }
  }

  handleFocus () {
    if (!this.state.showPicker) {
      if (this.state.hideTimeout) {
        window.clearTimeout(this.state.hideTimeout)
      }
      this.setState({ showPicker: true, hideTimeout: null })
    }
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
              id='password' className='with-feedback'
              ref={this.inputRef}
              type={this.state.reveal ? 'text' : 'password'} name='password'
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
          </div>
        </div>
        <div
          className={c({ 'form-item': true, emoji: true, hidden: !this.state.showPicker })}
        >
          <Picker
            onEmojiSelect={this.handleEmojiSelect}
            categories={['people', 'nature', 'foods', 'activity', 'places', 'objects', 'symbols', 'flags']}
            maxFrequentRows={0}
            emojiSize={36} perLine={this.state.narrowPicker ? 8 : 11} set='apple' i18n={emojiI18n}
            title='Emoji Password' previewEmoji='closed_lock_with_key'
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
