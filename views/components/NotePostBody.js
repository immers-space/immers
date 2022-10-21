import React, { useState } from 'react'
import DialogModal from './DialogModal'
import './ModelPostBody.css'
import EmojiButton from '../ap/EmojiButton'
import { immersClient } from '../ap/utils/immersClient'
import SanitizedHTML from '../components/SanitizedHTML'

export default function NotePostBody ({ className, html, activityId, ...props }) {
  const [isOpened, setIsOpened] = useState(false)
  const handleDeleteNote = () => { immersClient.deleteMessage(activityId) }
  const onProceed = () => {
    handleDeleteNote()
  }
  const onClose = () => {
    document.body.classList.remove('modal-open')
    setIsOpened(false)
  }

  return (
    <div className='relative'>
      <SanitizedHTML html={html} />
      <div className='modelActionButtons'>
        <EmojiButton emoji='x' title='Delete this Note' onClick={() => setIsOpened(true)} />
      </div>
      {isOpened && (
        <DialogModal
          title='Delete Note'
          description='Delete this message?'
          actionVerb='Delete'
          isOpened={isOpened}
          onProceed={onProceed}
          onClose={onClose}
        >
          <SanitizedHTML html={html} />
        </DialogModal>)}
    </div>
  )
}
