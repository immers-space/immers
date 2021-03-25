import { Emoji } from 'emoji-mart'
import React from 'react'

export default function EmojiButton ({ emoji, onClick, title }) {
  return (
    <div className='aesthetic-windows-95-button-title-bar'>
      <button onClick={onClick} title={title}>
        <Emoji emoji={emoji} size={14} set='apple' />
      </button>
    </div>
  )
}
