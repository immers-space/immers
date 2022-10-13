import React, { useEffect, useRef } from 'react'
import EmojiButton from '../ap/EmojiButton'

const DialogModal = ({
  title,
  isOpened,
  onProceed,
  onClose,
  children
}) => {
  const ref = useRef(null)

  useEffect(() => {
    if (isOpened) {
      document.body.classList.add('modal-open')
      ref.current?.showModal()
    } else {
      document.body.classList.remove('modal-open')
      ref.current?.close()
    }
  }, [isOpened])

  const proceedAndClose = () => {
    onProceed()
    onClose()
  }

  const preventAutoClose = (event) => event.stopPropagation()

  return (
    <dialog ref={ref} onCancel={onClose} onClick={onClose} className='aesthetic-windows-95-modal'>
      <div onClick={preventAutoClose}>
        <div className='aesthetic-windows-95-modal-title-bar'>
          <div className='aesthetic-windows-95-modal-title-bar-text'>{title}</div>
          <div class='aesthetic-windows-95-modal-title-bar-controls'>
            <div class='aesthetic-windows-95-button-title-bar'>
              <EmojiButton emoji='x' title='Cancel' onClick={() => onClose()} />
            </div>
          </div>
        </div>
        <div class='aesthetic-windows-95-modal-content'>
          <div className='aesthetic-windows-95-container-indent'>
            {children}
          </div>
        </div>
        <div className='flex'>
          <div className='aesthetic-windows-95-button'>
            <button onClick={proceedAndClose}>Remove</button>
          </div>
          <div className='flex aesthetic-windows-95-button'>
            <button onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </dialog>
  )
}

export default DialogModal
