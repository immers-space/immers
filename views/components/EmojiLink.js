import { Emoji } from './Emojis'
import React from 'react'

export default function EmojiLink ({ emoji, href, title }) {
  return (
    <a href={href} title={title}>
      <Emoji emoji={emoji} size={24} set='apple' />
    </a>
  )
}
