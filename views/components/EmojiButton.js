import './EmojiButton.css'
import { Emoji } from './Emojis'
import React from 'react'

export default function EmojiButton ({ emoji, onClick, title, disabled, tipSide = 'top' }) {
  // move tooltip up to wrapper when button is disabled so it can still appear
  const tip = { 'data-tooltip': title, 'data-placement': tipSide }
  const topTip = disabled ? tip : {}
  const buttonTip = disabled ? {} : tip
  return (
    <div className='emoji-button' {...topTip}>
      <button onClick={onClick} {...buttonTip} disabled={disabled}>
        <Emoji emoji={emoji} size={14} set='apple' />
      </button>
    </div>
  )
}
