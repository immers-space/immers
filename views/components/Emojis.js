import React from 'react'
import data from '@emoji-mart/data/sets/14/apple.json'
import emEnglish from '@emoji-mart/data/i18n/en.json'
import { init } from 'emoji-mart'

// emoji-mart requires side-effect, so this module wraps their components with the side-effect

export const emojiI18n = emEnglish
emojiI18n.pick = 'Emoji Password'
init({ data, i18n: emojiI18n })

export function Emoji ({ emoji, ...props }) {
  return (
    <em-emoji id={emoji} {...props} />
  )
}

export { default as Picker } from '@emoji-mart/react'
