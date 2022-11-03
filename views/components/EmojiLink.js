import { Emoji } from 'emoji-mart'
import React from 'react'
import { Link } from 'react-router-dom'

export default function EmojiLink ({ emoji, href, to, title }) {
  const emojo = <Emoji emoji={emoji} size={24} set='apple' />
  return to
    ? <Link to={to} title={title}>{emojo}</Link>
    : <a href={href} title={title}>{emojo}</a>
}
