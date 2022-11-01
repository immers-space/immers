import React, { useEffect, useRef } from 'react'

const DialogModal = ({
  title,
  isOpened,
  onProceed,
  onClose,
  description,
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
      <article onClick={preventAutoClose}>
        <header>
          <a className='close' href='#close_modal' aria-label='Cancel' onClick={() => onClose()} />
          <h3>{title}</h3>
        </header>
        <p>{description}</p>
        <section>
          {children}
        </section>
        <footer>
          <a role='button' href='#cancel' class='secondary' onClick={onClose}>Cancel</a>
          <a role='button' href='#remove' onClick={proceedAndClose}>Remove</a>
        </footer>
      </article>
    </dialog>
  )
}

export default DialogModal
