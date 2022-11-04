import React, { useState } from 'react'
import { AvatarPreview } from './AvatarPreview'
import EmojiButton from './EmojiButton'
import './ModelPostBody.css'
import DialogModal from './DialogModal'
import { immersClient, useProfile } from '../ap/utils/immersClient'

export default function ModelPostBody ({ model, showControls, activityID, ...props }) {
  const profile = useProfile()
  const [isOpened, setIsOpened] = useState(false)
  const isCurrentAvatar = profile?.avatarObject?.id === model.id
  const avatarTooltip = isCurrentAvatar
    ? 'This is your current avatar'
    : 'Make this your current avatar'
  const handleUseAvatar = () => { immersClient.useAvatar(model) }
  const handleRemoveAvatar = () => { immersClient.removeAvatar(activityID) }
  const onProceed = () => {
    handleRemoveAvatar()
  }
  const onClose = () => {
    document.body.classList.remove('modal-open')
    setIsOpened(false)
  }

  return (
    <div className='relative'>
      {showControls && (
        <div className='modelActionButtons'>
          <EmojiButton emoji='superhero' title={avatarTooltip} tipSide='left' disabled={isCurrentAvatar} onClick={handleUseAvatar} />
          <EmojiButton emoji='x' title='Remove this Avatar fom your collection' tipSide='left' disabled={isCurrentAvatar} onClick={() => setIsOpened(true)} />
        </div>
      )}
      {isOpened && (
        <DialogModal
          title='Remove avatar'
          description='Remove this avatar from your collection? The original will not be deleted.'
          actionVerb='Remove'
          isOpened={isOpened}
          onProceed={onProceed}
          onClose={onClose}
        >
          <AvatarPreview avatar={model} {...props} />
        </DialogModal>)}
      <AvatarPreview avatar={model} {...props} />
    </div>
  )
}
