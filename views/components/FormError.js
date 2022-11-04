import React from 'react'
import c from 'classnames'

export default function FormError (props) {
  return (
    <div className={c('form-item', { hidden: !props.show })}>
      <span className='error form-feedback'>{props.children}</span>
    </div>
  )
}
