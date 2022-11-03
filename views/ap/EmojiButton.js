import { Emoji } from 'emoji-mart'
import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function EmojiButton ({ emoji, onClick, to, title, disabled }) {
  const navigate = useNavigate()
  if (to && onClick) {
    console.warn('EmojiButton to prop overrides onClick')
  }
  // duplicating title on the wrapper allows tooltip even when disabled
  return (
    <div title={title} className='aesthetic-windows-95-button-title-bar'>
      <button onClick={to ? () => navigate(to) : onClick} title={title} disabled={disabled}>
        <Emoji emoji={emoji} size={14} set='apple' />
      </button>
    </div>
  )
}
