import React from 'react'
import c from 'classnames'

export default function GlitchError (props) {
  return (
    <div className={c({ 'form-item': true, hidden: !props.show })}>
      <span
        className='aesthetic-effect-text-glitch error'
        data-glitch='Unable to login. Please try again.'
      >
        {props.children}
      </span>
    </div>
  )
}
