import { Emoji } from './Emojis'
import React from 'react'
import { Link } from 'react-router-dom'

export default function EmojiLink ({ emoji, href, to, title, tipSide = 'top' }) {
  const emojo = <Emoji emoji={emoji} size={24} set='apple' />
  const tip = { 'data-tooltip': title, 'data-placement': tipSide }
  return to
    ? <Link to={to} {...tip}>{emojo}</Link>
    : <a className='emoji-link' href={href} {...tip}>{emojo}</a>
}
