import './EmojiButton.css'
import { Emoji } from './Emojis'
import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function EmojiButton ({ emoji, onClick, to, title, disabled, tipSide = 'top' }) {
  // move tooltip up to wrapper when button is disabled so it can still appear
  const tip = { 'data-tooltip': title, 'data-placement': tipSide }
  const topTip = disabled ? tip : {}
  const buttonTip = disabled ? {} : tip
  const navigate = useNavigate()
  if (to && onClick) {
    console.warn('EmojiButton to prop overrides onClick')
  }
  return (
    <div className='emoji-button' {...topTip}>
      <button onClick={to ? () => navigate(to) : onClick} {...buttonTip} disabled={disabled}>
        <Emoji emoji={emoji} size={14} set='apple' />
      </button>
    </div>
  )
}
