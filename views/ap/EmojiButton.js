import { Emoji } from 'emoji-mart'
import React from 'react'

export default function EmojiButton ({ emoji, onClick, title, disabled }) {
  // duplicating title on the wrapper allows tooltip even when disabled
  return (
    <div title={title} className='aesthetic-windows-95-button-title-bar'>
      <button onClick={onClick} title={title} disabled={disabled}>
        <Emoji emoji={emoji} size={14} set='apple' />
      </button>
    </div>
  )
}
