import React from 'react'
import { AvatarPreview } from './AvatarPreview'
import EmojiButton from './EmojiButton'
import './ModelPostBody.css'
import { immersClient, useProfile } from '../ap/utils/immersClient'

export default function ModelPostBody ({ model, showControls, ...props }) {
  const profile = useProfile()
  const isCurrentAvatar = profile?.avatarObject?.id === model.id
  const avatarTooltip = isCurrentAvatar
    ? 'This is your current avatar'
    : 'Make this your current avatar'
  const handleUseAvatar = () => { immersClient.useAvatar(model) }
  return (
    <div className='relative'>
      {showControls && (
        <div className='modelActionButtons'>
          <EmojiButton emoji='superhero' title={avatarTooltip} tipSide='left' disabled={isCurrentAvatar} onClick={handleUseAvatar} />
        </div>
      )}
      <AvatarPreview avatar={model} {...props} />
    </div>
  )
}
