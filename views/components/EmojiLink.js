import { Emoji } from './Emojis'
import React from 'react'

export default function EmojiLink ({ emoji, href, title, tipSide = 'top' }) {
  return (
    <a className='emoji-link' href={href} data-tooltip={title} data-placement={tipSide}>
      <Emoji emoji={emoji} size={24} set='apple' />
    </a>
  )
}
